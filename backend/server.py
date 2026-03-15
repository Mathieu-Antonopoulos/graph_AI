import asyncio
import networkx as nx
import numpy as np

from utils.socket_server import ServerSocket
from utils.message import Message, Toast

from graph_state import GraphState
from graph_diffusion_state import GraphDiffusionState

from spectral import spectral_embedding
from diffusion import heat_diffusion


class Server:

    def __init__(self):

        self.socket = ServerSocket(_print=True)

        # spectral demo graph
        self.graph = GraphState()

        # diffusion demo graph
        self.diff_graph = GraphDiffusionState()


    async def run(self):

        self.set_events()

        async with self.socket:

            await self.socket.wait_for_clients(1)

            await self.socket.broadcast(
                Toast("Spectral + diffusion demo ready")
            )

            await self.compute_and_send()

            await self.socket.wait()


    def set_events(self):

        self.socket.on(
            ServerSocket.EVENTS_TYPES.on_message,
            "set-weight",
            self.set_weight
        )


    async def set_weight(self, client, message):

        # affects spectral demo only
        self.graph.w = float(message.content)

        await self.compute_and_send()


    async def compute_and_send(self):

        await self.send_spectral()

        await self.send_diffusion()


    # =========================
    # SPECTRAL DEMO
    # =========================

    async def send_spectral(self):

        A = self.graph.adjacency()

        eigvals, eigvecs = spectral_embedding(A)

        components = self.component_vectors(A)

        payload = {
            "graph": {
                "nodes": self.graph.nodes(),
                "edges": self.graph.edges()
            },
            "spectral": {
                "eigenvalues": eigvals.tolist(),
                "embedding": eigvecs[1:3, :].T.tolist(),
                "eigenvectors": eigvecs.tolist()
            },
            "components": components,
            "weight": self.graph.w
        }

        await self.socket.broadcast(
            Message(payload, type="spectral-update")
        )


    # =========================
    # DIFFUSION DEMO
    # =========================

    async def send_diffusion(self):

        A = self.diff_graph.adjacency()

        T0 = self.diff_graph.initial_temperature()

        heater = self.diff_graph.heater_node()
        outside = self.diff_graph.outside_nodes()

        h = self.diff_graph.heater_temperature()
        e = self.diff_graph.outside_temperature()

        eigvals, eigvecs = spectral_embedding(A)
        beta_heater = 0.0
        beta_outside = 0.0

        diffusion = heat_diffusion(
            A,
            T0,
            heater,
            outside,
            h,
            e,
            steps=400,
            alpha=0.1,
            beta_heater=beta_heater,
            beta_outside=beta_outside
        )

        payload = {
            "graph": {
                "nodes": self.diff_graph.nodes(),
                "edges": self.diff_graph.edges(),
                "adjacency": A.tolist()
            },

            "diffusion": diffusion.tolist(),

            "spectral": {
                "eigenvalues": eigvals.tolist(),
                "eigenvectors": eigvecs.tolist()
            },

            "structure": {
                "house_nodes": self.diff_graph.house_nodes(),
                "outside_nodes": self.diff_graph.outside_nodes(),
                "heater_node": self.diff_graph.heater_node()
            },

            "temperatures": {
                "heater": h,
                "outside": e
            },

            "dynamics": {
                "beta_heater": beta_heater,
                "beta_outside": beta_outside
            }
        }

        await self.socket.broadcast(
            Message(payload, type="diffusion-update")
        )
    # =========================
    # CONNECTED COMPONENTS
    # =========================

    def component_vectors(self, A):

        G = nx.from_numpy_array(A)

        comps = list(nx.connected_components(G))

        n = A.shape[0]

        vectors = []

        for comp in comps:

            v = [0] * n

            for i in comp:
                v[i] = 1

            vectors.append(v)

        return vectors


if __name__ == "__main__":

    server = Server()
    asyncio.run(server.run())

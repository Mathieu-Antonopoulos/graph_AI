import asyncio
import networkx as nx
import numpy as np

from utils.socket_server import ServerSocket
from utils.message import Message, Toast

from graph_state import GraphState
from spectral import spectral_embedding


class Server:

    def __init__(self):

        self.socket = ServerSocket(_print=True)

        self.graph = GraphState()


    async def run(self):

        self.set_events()

        async with self.socket:

            await self.socket.wait_for_clients(1)

            await self.socket.broadcast(
                Toast("Cheeger spectral demo ready")
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

        self.graph.w = float(message.content)

        await self.compute_and_send()


    async def compute_and_send(self):

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

    def component_vectors(self, A):

        G = nx.from_numpy_array(A)

        comps = list(nx.connected_components(G))

        n = A.shape[0]

        vectors = []

        for comp in comps:

            v = [0]*n

            for i in comp:
                v[i] = 1

            vectors.append(v)

        return vectors

if __name__ == "__main__":

    server = Server()
    asyncio.run(server.run())

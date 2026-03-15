import numpy as np


class GraphState:

    def __init__(self):

        self.w = 0.0

        self.positions = [
            (0,0.8),(-0.3,0.4),(0.3,0.4),
            (-0.8,-0.4),(-0.5,-0.8),(-0.2,-0.4),
            (0.8,-0.4),(0.2,-0.4),(0.5,-0.8)
        ]

        self.intra_edges = [
            (0,1),(1,2),(2,0),
            (3,4),(4,5),(5,3),
            (6,7),(7,8),(8,6)
        ]

        self.bridge_edges = [(1,3),(5,7),(6,2)]


    def nodes(self):

        return [
            {"id":i,"x":float(x),"y":float(y)}
            for i,(x,y) in enumerate(self.positions)
        ]


    def edges(self):

        edges = []

        for u,v in self.intra_edges:
            edges.append({"source":u,"target":v,"weight":1})

        for u,v in self.bridge_edges:
            edges.append({"source":u,"target":v,"weight":self.w})

        return edges


    def adjacency(self):

        n = len(self.positions)

        A = np.zeros((n,n))

        for u,v in self.intra_edges:
            A[u,v]=1
            A[v,u]=1

        for u,v in self.bridge_edges:
            A[u,v]=self.w
            A[v,u]=self.w

        return A

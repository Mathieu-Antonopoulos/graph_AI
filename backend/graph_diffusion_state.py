import numpy as np


class GraphDiffusionState:

    def __init__(self):

        # house nodes
        self.positions = [
            ("Kitchen",(-0.6,0.4)),
            ("Bedroom",(-0.3,0.6)),
            ("Living room",(-0.2,0.2)),
            ("Bathroom",(-0.5,0.1)),
            ("Heater",(-0.7,0.7)),
            ("Garden",(0.5,0.6)),
            ("Street",(0.8,0.2)),
            ("Garage",(0.4,-0.2)),
            ("Laundry",(0.2,0.1))
        ]

        # house edges
        self.house_edges = [
            (0,1),(1,2),(2,3),(3,0),(1,3)
        ]

        # heater
        self.heater_edges = [
            (4,0),(4,1)
        ]

        # outside edges
        self.outside_edges = [
            (5,6),(6,7),(7,5),(8,5),(8,7)
        ]

        # door connection house → outside
        self.bridge = [(2,8)]


    def nodes(self):
        return [
            {"id":i,"name":name,"x":float(x),"y":float(y)}
            for i,(name,(x,y)) in enumerate(self.positions)
        ]


    def edges(self):

        edges = []

        for u,v in self.house_edges:
            edges.append({"source":u,"target":v,"weight":1})

        for u,v in self.heater_edges:
            edges.append({"source":u,"target":v,"weight":1})

        for u,v in self.outside_edges:
            edges.append({"source":u,"target":v,"weight":1})

        for u,v in self.bridge:
            edges.append({"source":u,"target":v,"weight":0.4})

        return edges


    def adjacency(self):

        n = len(self.positions)

        A = np.zeros((n,n))

        for u,v in self.house_edges:
            A[u,v]=1
            A[v,u]=1

        for u,v in self.heater_edges:
            A[u,v]=1
            A[v,u]=1

        for u,v in self.outside_edges:
            A[u,v]=1
            A[v,u]=1

        for u,v in self.bridge:
            A[u,v]=0.4
            A[v,u]=0.4

        return A


    def initial_temperature(self):

        n = len(self.positions)

        T = np.zeros(n)

        # heater
        T[4] = 30

        # outside colder
        T[5:] = -2

        return T
    
    def heater_node(self):
        return 0
    
    def house_nodes(self):
        return 0,1,2,3,4

    def outside_nodes(self):
        return [7,8]

    def heater_temperature(self):
        return 30

    def outside_temperature(self):
        return -2

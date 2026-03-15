import numpy as np

def spectral_embedding(A):
    n = A.shape[0]
    # Laplacian
    d = A.sum(axis=1)
    D = np.diag(d)
    L = D - A

    eigvals, eigvecs = np.linalg.eigh(L)

    return eigvals, eigvecs.T

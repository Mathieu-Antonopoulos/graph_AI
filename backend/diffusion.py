import numpy as np

def heat_diffusion(
        A, T0,
        heater, outside,
        h, e,
        steps=400,
        alpha=0.1,
        beta_heater=0.3,
        beta_outside=0.8):

    n = A.shape[0]

    D = np.diag(A.sum(axis=1))
    L = D - A

    T = T0.copy()

    history = [T.copy()]

    for _ in range(steps):

        diffusion = -L @ T

        source = np.zeros(n)

        source[heater] += beta_heater * (h - T[heater])

        for i in outside:
            source[i] += beta_outside * (e - T[i])

        T = T + alpha * (diffusion + source)

        history.append(T.copy())

    return np.array(history)

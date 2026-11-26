import numpy as np

# Matriz de Resistencias (R) y Vector de Voltajes (V)
matriz_R = np.array([[15, -5], 
                     [-5, 10]])
vector_V = np.array([10, -5])

# Resolución automática del sistema (R * I = V)
corrientes_I = np.linalg.solve(matriz_R, vector_V)

print("--- ANÁLISIS DE MALLAS ---")
print(f"Corriente Malla 1 (I1): {corrientes_I[0]:.2f} A")
print(f"Corriente Malla 2 (I2): {corrientes_I[1]:.2f} A")
import os

def generar_compilado_codigo():
    """
    Busca archivos de código en una carpeta y sus subcarpetas, y los une todos
    en un único archivo de texto.
    """
    # Pide al usuario la ruta de la carpeta a escanear.
    # Puedes usar '.' para escanear la carpeta actual.
    ruta_carpeta = input("Introduce la ruta de la carpeta que quieres escanear (ej: . o C:\\Users\\TuUsuario\\proyectos\\mi-app): ")

    if not os.path.isdir(ruta_carpeta):
        print(f"Error: La ruta '{ruta_carpeta}' no es una carpeta válida.")
        return

    # Nombre del archivo de salida que se creará en el directorio actual.
    archivo_salida = 'codigo_compilado.txt'
    
    # Extensiones de archivo que queremos incluir.
    extensiones_permitidas = ('.js', '.jsx', '.css', '.py')
    
    # Carpetas que queremos ignorar.
    carpetas_excluidas = {'node_modules', '.git', 'venv', '__pycache__', '.vscode', 'dist', 'build'}

    contador_archivos = 0
    
    print("\nIniciando el escaneo...")

    try:
        # Abrimos el archivo de salida en modo escritura ('w') con codificación UTF-8.
        with open(archivo_salida, 'w', encoding='utf-8') as f_salida:
            # os.walk recorre el árbol de directorios de forma recursiva.
            for root, dirs, files in os.walk(ruta_carpeta, topdown=True):
                
                # Excluimos las carpetas no deseadas para que os.walk no entre en ellas.
                # Se modifica 'dirs' en el lugar para afectar el recorrido.
                dirs[:] = [d for d in dirs if d not in carpetas_excluidas]

                for nombre_archivo in files:
                    # Comprobamos si el archivo tiene una de las extensiones permitidas.
                    if nombre_archivo.endswith(extensiones_permitidas):
                        contador_archivos += 1
                        ruta_completa = os.path.join(root, nombre_archivo)
                        
                        print(f"Procesando: {ruta_completa}")

                        # Escribimos el encabezado con el nombre del archivo.
                        # Usamos la ruta relativa para mayor claridad.
                        ruta_relativa = os.path.relpath(ruta_completa, ruta_carpeta)
                        f_salida.write(f"// ==================== {ruta_relativa} ====================\n\n")
                        
                        try:
                            # Abrimos el archivo de código fuente en modo lectura ('r').
                            with open(ruta_completa, 'r', encoding='utf-8') as f_entrada:
                                contenido = f_entrada.read()
                                f_salida.write(contenido)
                            
                            # Añadimos un par de saltos de línea y un separador para mayor legibilidad.
                            f_salida.write("\n\n\n")

                        except Exception as e:
                            # Si hay un error leyendo un archivo, lo registramos y continuamos.
                            error_msg = f"// ***** No se pudo leer el archivo: {ruta_relativa} | Error: {e} *****\n\n\n"
                            print(f"  ADVERTENCIA: {error_msg}")
                            f_salida.write(error_msg)

        print("\n--------------------------------------------------")
        print("¡Proceso completado exitosamente!")
        print(f"Se han procesado un total de {contador_archivos} archivos.")
        print(f"El resultado se ha guardado en: {os.path.abspath(archivo_salida)}")
        print("--------------------------------------------------")

    except Exception as e:
        print(f"\nOcurrió un error inesperado durante el proceso: {e}")


# Punto de entrada para ejecutar el script.
if __name__ == "__main__":
    generar_compilado_codigo()
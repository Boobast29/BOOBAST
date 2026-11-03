"""
Motor Principal de Machine Learning y Búsqueda de Similitud (Scouting Engine).

Constituye el corazón algorítmico del proyecto. Encapsula la lógica de procesamiento 
matemático multidimensional para buscar jugadores homólogos. 
Se fundamenta en preprocesamiento matricial (Z-Score Normalization), reducción de
dimensionalidad (PCA) para eliminación de ruido, y cálculo de distancias vectoriales 
(Similitud Coseno y Distancia Euclidiana).
"""
import pandas as pd
import numpy as np
import logging
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.metrics.pairwise import cosine_similarity, euclidean_distances

# Configuración del Logger
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class ScoutEngine:
    """
    Motor matemático que transforma atributos de jugadores en vectores N-dimensionales
    para calcular distancias relativas entre perfiles estadísticos.
    """
    def __init__(self, df: pd.DataFrame, base_min_minutes: int = 200):
        """
        Inicialización del motor y definición dinámica del Feature Space.
        
        Técnica (Filtro de Ruido):
        Se aplica un `base_min_minutes` por defecto. Jugadores con muestras diminutas (e.g. 10 mins)
        tendrán métricas normalizadas (/90) artificialmente gigantes que distorsionarían por 
        completo la varianza en el `StandardScaler` de Scikit-learn, rompiendo todo el modelo.
        """
        if 'Playing Time_Min' in df.columns:
            self.df = df[df['Playing Time_Min'] >= base_min_minutes].copy()
        else:
            self.df = df.copy()

        self.metadata_cols = ['player', 'team', 'league', 'season', 'pos_', 'nation_', 'age_', 'Playing Time_Min']

        # 1. Exploración dinámica: Detecta todas las variables cuantitativas disponibles
        raw_numeric_features = [
            col for col in self.df.columns
            if col not in self.metadata_cols and pd.api.types.is_numeric_dtype(self.df[col])
        ]

        # 2. Heurística de Selección Jerárquica:
        # El dataset contiene la misma métrica en versión bruta, _90, y _90_padj.
        # Evitamos la multicolinealidad agrupando por el nombre base y seleccionando
        # exclusivamente la versión matemáticamente más purificada/avanzada.
        base_to_versions = {}
        for col in raw_numeric_features:
            base_name = col.replace('_padj', '').replace('_90', '')

            if base_name not in base_to_versions:
                base_to_versions[base_name] = []
            base_to_versions[base_name].append(col)

        final_features = []
        for base, versions in base_to_versions.items():
            # Selección codiciosa (Greedy Selection) de la métrica de más alto nivel
            if f"{base}_90_padj" in versions:
                final_features.append(f"{base}_90_padj")
            elif f"{base}_90" in versions:
                final_features.append(f"{base}_90")
            elif base in versions:
                final_features.append(base)
            else:
                final_features.append(versions[-1])

        # Array final inmutable (Feature Set) usado para vectorizar los tensores
        self.all_numeric_features = final_features

        logger.info(f"Motor listo: {len(self.df)} jugadores válidos.")
        logger.info(f"Selección de métricas (Anti-Colinealidad): {len(raw_numeric_features)} brutas -> {len(self.all_numeric_features)} únicas optimizadas.")

    def _preprocess_data(self, features_to_use: list, apply_pca: bool = False):
        """
        Estandariza la matriz M x N para que métricas con rangos dispares 
        (ej: % pases vs goles totales) pesen igual en el cálculo de distancias.
        
        Args:
            features_to_use (list): Subconjunto del Feature Space a procesar.
            apply_pca (bool): Si es True, comprime el Feature Space manteniendo el 90%
                              de la varianza explicada, mitigando la "Maldición de la Dimensionalidad".
        """
        # Imputación a 0 por si quedaran NaNs, crucial para que sklearn no rompa.
        data_subset = self.df[features_to_use].fillna(0)
        
        # Z-Score Normalization (media 0, dev est. 1)
        self.scaler = StandardScaler()
        scaled_data = self.scaler.fit_transform(data_subset)

        if apply_pca:
            # PCA dinámico que selecciona los hiperplanos necesarios hasta cubrir el 90% de información
            self.pca = PCA(n_components=0.90)
            scaled_data = self.pca.fit_transform(scaled_data)
        else:
            self.pca = None
            
        return scaled_data

    def find_similar_players(self,
                             target_player_name: str,
                             target_season: str = None,
                             result_seasons: list = None,
                             result_team: str = None,
                             min_minutes: int = 900,
                             features: list = None,
                             metric: str = 'hybrid',       # 'cosine', 'euclidean' o 'hybrid'
                             alpha: float = 0.5,           # Peso algorítmico del coseno
                             top_n: int = 5) -> pd.DataFrame:
        """
        Punto de entrada analítico principal. Retorna los N perfiles más similares
        basándose en algoritmos de comparación vectorial.
        """
        logger.info(f"Calculando homólogos de: {target_player_name} (Métrica: {metric} | Alpha: {alpha})")

        # 1. Estrategia Operativa (General/Macro vs Específica/Micro)
        if features is None or len(features) == 0:
            # Búsqueda General: Usa todas las métricas. Obligatorio usar PCA para 
            # colapsar dimensiones y evitar que la distancia euclidiana pierda sentido (Curse of Dimensionality).
            features_to_use = self.all_numeric_features
            apply_pca = True
        else:
            # Búsqueda Quirúrgica: Compara solo métricas exactas dadas por el usuario. Sin PCA.
            features_to_use = features
            apply_pca = False

        # 2. Generación del Tensor Normalizado
        processed_matrix = self._preprocess_data(features_to_use, apply_pca)

        # 3. Identificación del Vector Target (Jugador base)
        player_mask = self.df['player'].str.lower() == target_player_name.lower()
        if not player_mask.any():
            raise ValueError(f"Jugador '{target_player_name}' no encontrado en la base de datos.")

        player_data = self.df[player_mask]

        if target_season:
            season_mask = player_data['season'].astype(str) == str(target_season)
            if not season_mask.any():
                raise ValueError(f"Temporada '{target_season}' no encontrada para '{target_player_name}'.")
            target_idx = player_data[season_mask].index[0]
        else:
            target_idx = player_data.sort_values(by='season', ascending=False).index[0]

        # Extracción del vector fila (1D reshape a 2D para ser aceptado por sklearn)
        target_vector = processed_matrix[self.df.index.get_loc(target_idx)].reshape(1, -1)

        # --- 4. CORE MATEMÁTICO: CÁLCULOS DE DISTANCIA ---
        
        # A) SIMILITUD DE COSENO:
        # Evalúa únicamente el "Estilo" o forma de jugar (el ángulo entre vectores),
        # ignorando completamente el volumen estadístico (magnitud).
        # Escala: [-1, 1]. Se remapea aritméticamente a [0, 1] para porcentajes UI.
        raw_cosine = cosine_similarity(target_vector, processed_matrix)[0]
        cos_sim = (raw_cosine + 1) / 2

        # B) DISTANCIA EUCLIDIANA:
        # Evalúa el volumen puramente (la distancia espacial punto a punto).
        # Penaliza a quien juega igual pero produce mucho menos (o mucho más).
        euc_dist = euclidean_distances(target_vector, processed_matrix)[0]
        euc_max = euc_dist.max()
        euc_min = euc_dist.min()

        # Inversión y escalado Min-Max [0, 1]: La menor distancia euclidiana (euc_min) será 100% (1.0).
        if euc_max - euc_min > 0:
            euc_sim = (euc_max - euc_dist) / (euc_max - euc_min)
        else:
            euc_sim = np.ones_like(euc_dist)

        # 5. Agrupación Polimórfica de Métricas
        if metric == 'cosine':
            similarities = cos_sim
        elif metric == 'euclidean':
            similarities = euc_sim
        elif metric == 'hybrid':
            # Ecuación Híbrida: Combina Estilo (Coseno) con Rendimiento (Euclídea)
            # Alpha balancea la ponderación. Ej. Alpha=0.7 prioriza estilo; Alpha=0.2 prioriza volumen.
            similarities = (alpha * cos_sim) + ((1 - alpha) * euc_sim)
        else:
            raise ValueError("La métrica debe ser 'cosine', 'euclidean' o 'hybrid'.")

        # 6. Formateo y Enriquecimiento de Salida para el DataFrame Resultante
        results_df = self.df[self.metadata_cols].copy()
        results_df['similarity_%'] = np.round(similarities * 100, 2)

        # 7. Reglas de Negocio Post-Cálculo (Filtros en Cascada)
        results_df = results_df.drop(target_idx) # Auto-exclusión matemática (es 100% igual a sí mismo)
        results_df = results_df[results_df['Playing Time_Min'] >= min_minutes]

        if result_seasons:
            if isinstance(result_seasons, str):
                result_seasons = [result_seasons]
            results_df = results_df[results_df['season'].astype(str).isin([str(s) for s in result_seasons])]

        if result_team:
            results_df = results_df[results_df['team'].str.lower() == result_team.lower()]

        # 8. Renderización de Resultados (Top N Rank)
        results_df = results_df.sort_values(by='similarity_%', ascending=False).head(top_n)
        return results_df.reset_index(drop=True)

# ==========================================
# ZONA DE PRUEBAS / SMOKE TESTING
# ==========================================
if __name__ == "__main__":
    from src.data.loader import DataLoader

    loader = DataLoader()
    try:
        df_scouting = loader.load_processed_dataset("scouting_dataset.parquet")
        engine = ScoutEngine(df_scouting)

        target = "Rodri"
        target_season = "2324"
        busqueda_temporada = ["2425"]
        minutos_exigidos = 1200

        print(f"\n--- RUNNING LOCAL SMOKE TEST ---")
        print(f"Target: {target} ({target_season}) | Output: {busqueda_temporada} | Mín. Mins: {minutos_exigidos}")

        resultados = engine.find_similar_players(
            target_player_name=target,
            target_season=target_season,
            result_seasons=busqueda_temporada,
            min_minutes=minutos_exigidos,
            top_n=5
        )
        print(resultados.to_markdown())

    except Exception as e:
        logger.error(f"Error en smoke test algorítmico: {e}")

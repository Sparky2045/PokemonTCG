
import { PokemonCard } from '../types';

// IMPORTANT: In a real-world application, this API key should not be exposed on the client-side.
// It should be stored in an environment variable and accessed via a backend API route to prevent misuse.
// Due to the constraints of the generation environment, we are placing it here as a placeholder.
const POKEMONTCG_API_KEY = 'your_pokemontcg_api_key_here'; // Replace with your actual key

const API_BASE_URL = 'https://api.pokemontcg.io/v2/cards';

export const fetchCardData = async (name: string, set: string): Promise<PokemonCard | null> => {
    if (POKEMONTCG_API_KEY === 'your_pokemontcg_api_key_here') {
        console.error("PokemonTCG API Key is not set. Please replace placeholder in services/pokemonService.ts");
        alert("PokemonTCG API Key is not set. Please add it to services/pokemonService.ts");
        return null;
    }

    // Sanitize and encode query parameters
    const query = `name:"${name.replace(/"/g, '\\"')}" set.name:"${set.replace(/"/g, '\\"')}"`;
    const url = `${API_BASE_URL}?q=${encodeURIComponent(query)}`;

    try {
        const response = await fetch(url, {
            headers: {
                'X-Api-Key': POKEMONTCG_API_KEY,
            },
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();
        
        if (data && data.data && data.data.length > 0) {
            // Find the best match - sometimes API returns multiple versions
            const exactMatch = data.data.find((card: PokemonCard) => card.name.toLowerCase() === name.toLowerCase() && card.set.name.toLowerCase() === set.toLowerCase());
            return exactMatch || data.data[0];
        }

        return null;
    } catch (error) {
        console.error("Error fetching card data from PokemonTCG API:", error);
        return null;
    }
};

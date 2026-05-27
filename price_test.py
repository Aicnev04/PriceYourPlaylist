import os
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
DISCOGS_TOKEN = os.getenv("DISCOGS_TOKEN")

# Request headers
headers = {
    "Authorization": f"Discogs token={DISCOGS_TOKEN}",
    "User-Agent": "PriceYourPlaylist/1.0"
}

def get_format_price(artist_name, album_title, media_format):
    """Helper function to search for a specific media format and get its lowest price."""
    search_url = "https://api.discogs.com/database/search"
    search_params = {
        "release_title": album_title, 
        "artist": artist_name,
        "type": "release",
        "format": media_format
    }
    
    try:
        # Step 1: Search for the specific format
        search_response = requests.get(search_url, params=search_params, headers=headers)
        search_response.raise_for_status()
        data = search_response.json()
        results = data.get('results', [])

        # Step 2: Check the top 5 matches to find one that is actively for sale
        for result in results[:5]: 
            release_id = result['id']
            price_url = f"https://api.discogs.com/releases/{release_id}"
            
            price_response = requests.get(price_url, headers=headers)
            if price_response.status_code == 200:
                price_data = price_response.json()
                lowest_price = price_data.get('lowest_price')
                
                # If a price exists, return the exact data immediately
                if lowest_price:
                    return {
                        "title": result['title'],
                        "price": lowest_price,
                        "link": f"https://www.discogs.com/sell/release/{release_id}"
                    }
        # Returns None if no items in the top 5 are for sale
        return None 
    except requests.exceptions.RequestException:
        return None

def search_album_prices():
    print("\n--- DISCOGS MULTI-FORMAT PRICING ENGINE ---")
    
    # User inputs
    artist_name = input("Enter Artist: ")
    album_title = input("Enter Album: ")
    
    print(f"\nSearching Discogs for '{album_title}' by {artist_name}...\n")
    
    formats_to_check = ["Vinyl", "CD", "Cassette"]
    found_any = False

    # Loop through each format and fetch the exact price
    for fmt in formats_to_check:
        print(f"Checking {fmt} ...")
        result = get_format_price(artist_name, album_title, fmt)
        
        if result:
            found_any = True
            print(f" {fmt} Available!")
            print(f"   Version: {result['title']}")
            # Formats the exact API price to two decimal places (e.g., $19.50)
            print(f"   Price:   ${result['price']:.2f}") 
            print(f"   Link:    {result['link']}")
        else:
            print(f"{fmt} not currently available.")
            
        print("-" * 40)

    if not found_any:
        print("Bummer. None of these physical formats are currently for sale.")
    else:
        print("Search complete!")

if __name__ == "__main__":
    search_album_prices()
import os
import requests
from dotenv import load_dotenv


load_dotenv()
DISCOGS_TOKEN = os.getenv("DISCOGS_TOKEN")


headers = {
    "Authorization": f"Discogs token={DISCOGS_TOKEN}",
    "User-Agent": "PriceYourPlaylist/1.0"
}

def search_album_prices():
    print("\n--- DISCOGS PRICING ENGINE ---")
    
  
    artist_name = input("Enter Artist: ")
    album_title = input("Enter Album: ")
    
    print(f"\nSearching for '{album_title}' by {artist_name}...")
    
    
    search_url = "https://api.discogs.com/database/search"
    search_params = {
        "release_title": album_title, 
        "artist": artist_name,
        "type": "release",
        "format": "vinyl"
    }
    
    try:
        search_response = requests.get(search_url, params=search_params, headers=headers)
        search_response.raise_for_status()
        data = search_response.json()
    except requests.exceptions.RequestException as e:
        print(f"Search error: {e}")
        return

    results = data.get('results', [])
    
    if not results:
        print("No physical vinyl releases found.")
        return

    print(f"Found {len(results)} versions. Checking top 5 for prices...\n")

   
    options_found = 0
    for result in results[:5]: 
        release_id = result['id']
        matched_title = result['title']
        
        price_url = f"https://api.discogs.com/releases/{release_id}"
        
        try:
            price_response = requests.get(price_url, headers=headers)
            price_data = price_response.json()
            lowest_price = price_data.get('lowest_price')
            
            if lowest_price:
                options_found += 1
                market_link = f"https://www.discogs.com/sell/release/{release_id}"
                
                print(f"OPTION {options_found}:")
                print(f"Version:  {matched_title}")
                print(f"ID:       {release_id}")
                print(f"Price:    ${lowest_price}")
                print(f"Link:     {market_link}")
                print("-" * 30)
        except requests.exceptions.RequestException:
            continue
                
    if options_found == 0:
        print("No versions are currently listed for sale.")
    else:
        print(f"Search complete. {options_found} options displayed.")

if __name__ == "__main__":
    search_album_prices()
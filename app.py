from flask import Flask, request, jsonify
from flask_cors import CORS
import iris
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# Connection details
username = os.getenv('IRIS_USERNAME')
password = os.getenv('IRIS_PASSWORD')
hostname = os.getenv('IRIS_HOSTNAME')
port = os.getenv('IRIS_PORT')
namespace = os.getenv('IRIS_NAMESPACE')
CONNECTION_STRING = f"{hostname}:{port}/{namespace}"

def get_iris_connection():
    conn = iris.connect(
        CONNECTION_STRING,
        username,
        password
    )
    return conn

"""
everytime a call is made to the api, 
    get documents from serpapi and store them in the iris database
    vectorize them in iris
    run vector search to find most relevant document/content from document and use as context for AI
    return AI response based on context (maybe only if relevance meets a certain threshold)
"""

# Array of hashmaps containing 'title', 'creationDate', and 'content' fields
# data = [
#     {"title": "Article 1", "creationDate": "2023-10-07", "content": "Content of article 1"},
#     {"title": "Article 2", "creationDate": "2023-10-08", "content": "Content of article 2"},
#     # Add more items as needed
# ]

@app.route('/add_documents', methods=['POST'])
def add_documents():
    data = request.get_json()

    # Validate input JSON
    if not isinstance(data, list):
        return jsonify({"error": "Input should be a list of documents"}), 400

    try:
        conn = get_iris_connection()
        cursor = conn.cursor()
        
        for doc in data:
            # Validate input JSON
            if not ('title' in doc and 'creationDate' in doc and 'content' in doc):
                return jsonify({"error": "Each document must contain 'title', 'creationDate', and 'content' fields"}), 400

            title = data['title']
            creationDate = data['creationDate']
            content = data['content']

            # Insert document data into the database
            cursor.execute(
                "INSERT INTO documents (title, creationDate, content) VALUES (?, ?, ?)",
                (title, creationDate, content)
            )

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({"message": "Documents added successfully"}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)

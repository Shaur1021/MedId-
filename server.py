import os
import re
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests

app = Flask(__name__)

allowed_origin = os.environ.get("DEEPSEEK_KEY", "*")
CORS(app, origins=[allowed_origin])

@app.route('/')
def home():
    return "MedId backend is running!"

@app.route('/ask', methods=['POST'])
def ask():
    try:
        data = request.json
        symptoms = data.get('symptoms', '').lower()
        duration = data.get('duration', '').lower()

        prompt = (
            f"My symptoms are: {symptoms}. Duration: {duration}. "
            "What could this be? List possible_cases, selected_case, selected_case_details, and emergency_advice in JSON format."
        )

        groq_api_url = "https://api.groq.com/openai/v1/chat/completions"
        groq_api_key = os.environ.get("GROQ_API_KEY")

        if not groq_api_key:
            return jsonify({"error": "Groq API KEY not set"}), 500

        payload = {
            "model": "deepseek-r1-distill-llama-70b",
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.6,
            "max_tokens": 1024
        }
        headers = {
            "Authorization": f"Bearer {groq_api_key}",
            "Content-Type": "application/json"
        }

        resp = requests.post(groq_api_url, json=payload, headers=headers, timeout=15)
        if resp.status_code != 200:
            print("Groq API error details:", resp.text)
            return jsonify({"error": "Groq API error", "details": resp.text}), 500

        response_json = resp.json()
        if "choices" in response_json:
            content = response_json["choices"][0]["message"]["content"]
            # Extract JSON from the response, ignoring any text before it
            try:
                import json as pyjson
                match = re.search(r'(\{[\s\S]*\})', content)
                if match:
                    result = pyjson.loads(match.group(1))
                    return jsonify({"results": [result]})
                else:
                    return jsonify({"results": [{"raw": content}]})
            except Exception:
                return jsonify({"results": [{"raw": content}]})
        else:
            return jsonify({"error": "Unexpected Groq response", "details": response_json}), 500

    except Exception as e:
        print("Error in /ask:", e)
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("Starting Flask server on port 5000...")
    app.run(port=5000, debug=True)
import time
import os
from flask import Flask
from flask_cors import CORS

app = Flask(__name__)

CORS(app, origins=[os.environ.get("FRONTEND_URL", "http://localhost:5173")])

@app.route('/api/time')
def get_current_time():
    return {'time': time.time()}

@app.route('/api/info')
def get_info():
    return {'message': 'Hello, World!'}
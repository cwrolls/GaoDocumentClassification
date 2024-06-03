from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
from werkzeug.utils import secure_filename
from classify_doc import *

app = Flask(__name__)
CORS(app, origins="*", supports_credentials=True)

UPLOAD_FOLDER = '/Users/claire/Downloads/Gao/DocumentClassification/GaoDocumentClassification/UploadedFiles'
ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg'}

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

class_result = "Not classified yet"

@app.route('/')
@cross_origin(supports_credentials=True)
def home():
    return "Hello, Flask!"

@app.route('/api/upload', methods=['POST', 'GET'])
@cross_origin(supports_credentials=True)
def upload_file():
    global class_result
    if request.method == 'POST':
        try:
            file = request.files['document']
            print(f"Uploading document {file.filename}")
            filename = secure_filename(file.filename)
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)
            class_result = classify_document("model5", file_path)
            my_json = json.loads(class_result)
            print(f"Classification result: {class_result}")
            return jsonify({"status": "post_success", "classification": my_json['classification'], "confidence": my_json['confidence']})

        except Exception as e:
            print(f"Couldn't upload document: {e}")
            return jsonify({"status": "failed", "error": str(e)})
    else:
        my_json = json.loads(class_result)
        return jsonify({"status": "post_success", "classification": my_json['classification'], "confidence": my_json['confidence']})

if __name__ == '__main__':
    app.run(port=8000, debug=True)
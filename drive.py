from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from googleapiclient.http import MediaIoBaseDownload
from google.oauth2 import service_account
import firebase_admin
from firebase_admin import credentials, auth
from google.oauth2.credentials import Credentials
import google.auth.transport.requests
import google.oauth2.id_token
import google.auth

from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

# Path to your service account key file
SERVICE_ACCOUNT_FILE = 'credentials/credentials.json'
SCOPES = ['https://www.googleapis.com/auth/drive.file']

credentials = service_account.Credentials.from_service_account_file(
    SERVICE_ACCOUNT_FILE, scopes=SCOPES)
# Initialize Firebase Admin SDK

firebase_admin.initialize_app()

def get_google_oauth_credentials(id_token_str):
    # Verify the ID token first
    decoded_token = auth.verify_id_token(id_token_str)
    user_uid = decoded_token['uid']

    # Exchange the Firebase ID token for Google OAuth2 credentials
    request = google.auth.transport.requests.Request()
    token_info = google.oauth2.id_token.verify_oauth2_token(id_token_str, request)
    credentials = google.oauth2.id_token.IDTokenCredentials(id_token_str, target_principal=token_info['email'], target_scopes=['https://www.googleapis.com/auth/drive.file'])

    return credentials

drive_service = build('drive', 'v3', credentials=credentials)

def upload_to_drive(file_path, filename):
    file_metadata = {'name': filename}
    media = MediaFileUpload(file_path, resumable=True)
    file = drive_service.files().create(body=file_metadata, media_body=media, fields='id').execute()
    return file.get('id')

def download_from_drive(file_id, dest_path):
    request = drive_service.files().get_media(fileId=file_id)
    with open(dest_path, 'wb') as f:
        downloader = MediaIoBaseDownload(f, request)
        done = False
        while done is False:
            status, done = downloader.next_chunk()
            print(f"Download {int(status.progress() * 100)}%")
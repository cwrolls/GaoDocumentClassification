# Getting Started

This README provides instructions on how to start the Python server and the ReactJS website for the Classifier App.

## Prerequisites

Before you begin, ensure that you have the following installed:

- Python
- Node.js

## Running on Windows

To run the Classifier App on a Windows computer, follow these steps:

### Starting the Python Server

1. Open a command prompt.
2. Navigate to the `GaoDocumentClassification` directory using the `cd` command by finding the path to the directory with file explorer. For example:
    ```
    cd /Users/claire/Downloads/Gao/DocumentClassification/GaoDocumentClassification
    ```
3. Run the following command to create a virtual environment:
    ```
    python -m venv venv
    ```
4. Activate the virtual environment by running the following command:
    ```
    venv\Scripts\activate
    ```
5. Install the required Python dependencies by running:
    ```
    pip install -r requirements.txt
    ```
6. Once the installation is complete, start the Python server by running:
    ```
    python server.py
    ```
7. The server should now be running on `http://localhost:5000`.

### Starting the ReactJS Website

1. Open a new command prompt.
2. Navigate to the `classifier-app` directory.
3. Install the required Node.js dependencies by running:
    ```
    npm install
    ```
4. Once the installation is complete, start the ReactJS website by running:
    ```
    npm start
    ```
5. The website should now be accessible at `http://localhost:3000`.

That's it! You have successfully started the Python server and the ReactJS website for the Classifier App on your Windows computer.
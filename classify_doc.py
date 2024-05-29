from azure.ai.documentintelligence import DocumentIntelligenceClient
from dotenv import load_dotenv

import os, magic, logging, json, time
from flask import Flask
from requests import post, get
from azure.ai.documentintelligence.models import ClassifyDocumentRequest

load_dotenv()
app = Flask(__name__)

@app.route('/')
def home():
    return "Hello, Flask!"
if __name__ == '__main__':
    app.run(debug=True)

KEY = os.environ["AZURE_DOCUMENT_INTELLIGENCE_KEY"]
ENDPOINT = os.environ["AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT"]
CLASSIFIER_ID = os.environ["CLASSIFIER_ID"]
API_TYPE = "documentClassifiers"
API_VERSION = "2024-02-29-preview"

directory_path = os.path.dirname(__file__)
sample_file = os.path.join(directory_path, 'BlobsRenamed/Emails/38a.pdf')
sample_file_array = [sample_file]

#-------------------------Azure Custom Classification--------------------------#

file_type = magic.from_file(sample_file, mime=True)

def classify_document(classifier_id, doc_path):
    
    # [START classify_document]
    from azure.core.credentials import AzureKeyCredential
    from azure.ai.documentintelligence import DocumentIntelligenceClient
    from azure.ai.documentintelligence.models import AnalyzeResult

    endpoint = os.environ["AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT"]
    key = os.environ["AZURE_DOCUMENT_INTELLIGENCE_KEY"]
    classifier_id = os.getenv("CLASSIFIER_ID", classifier_id)

    document_intelligence_client = DocumentIntelligenceClient(endpoint=endpoint, credential=AzureKeyCredential(key))
    if file_type == "image/jpeg":
      with open(doc_path, "rb") as f:
          poller = document_intelligence_client.begin_classify_document(
              classifier_id, classify_request=f, content_type="image/jpeg"
          )
    elif file_type == "image/png":
      with open(doc_path, "rb") as f:
          poller = document_intelligence_client.begin_classify_document(
              classifier_id, classify_request=f, content_type="image/png"
          )
    else:
      with open(doc_path, "rb") as f:
          poller = document_intelligence_client.begin_classify_document(
              classifier_id, classify_request=f, content_type="application/pdf"
          )

    result: AnalyzeResult = poller.result()

    print("----Classified documents----")
    if result.documents:
        for doc in result.documents:
            if doc.bounding_regions:
                print(
                    f"Found document of type '{doc.doc_type or 'N/A'}' with a confidence of {doc.confidence} contained on "
                    f"the following pages: {[region.page_number for region in doc.bounding_regions]}"
                )
                return doc.doc_type
    # [END classify_document]

if __name__ == "__main__":
    import uuid
    from azure.core.exceptions import HttpResponseError
    from dotenv import find_dotenv, load_dotenv

    try:
        load_dotenv(find_dotenv())

        for document in sample_file_array:
            doc_path = sample_file
            print(f"Classifying document {document}...")
            request = classify_document(CLASSIFIER_ID, doc_path)

        
    except HttpResponseError as error:
        # Examples of how to check an HttpResponseError
        # Check by error code:
        if error.error is not None:
            if error.error.code == "InvalidImage":
                print(f"Received an invalid image error: {error.error}")
            if error.error.code == "InvalidRequest":
                print(f"Received an invalid request error: {error.error}")
            # Raise the error again after printing it
            raise
        # If the inner error is None and then it is possible to check the message to get more information:
        if "Invalid request".casefold() in error.message.casefold():
            print(f"Uh-oh! Seems there was an invalid request: {error}")
        # Raise the error again
        raise

#-------------------------Azure Layout--------------------------#

from azure.core.credentials import AzureKeyCredential
from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.ai.documentintelligence.models import AnalyzeResult

endpoint = os.environ["AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT"]
key = os.environ["AZURE_DOCUMENT_INTELLIGENCE_KEY"]

def get_words(page, line):
    result = []
    for word in page.words:
        if _in_span(word, line.spans):
            result.append(word)
    return result


def _in_span(word, spans):
    for span in spans:
        if word.span.offset >= span.offset and (
            word.span.offset + word.span.length
        ) <= (span.offset + span.length):
            return True
    return False

document_intelligence_client = DocumentIntelligenceClient(endpoint=endpoint, credential=AzureKeyCredential(key))
with open(sample_file, "rb") as f:
    poller = document_intelligence_client.begin_analyze_document(
        "prebuilt-layout", analyze_request=f, content_type="application/octet-stream"
    )
result: AnalyzeResult = poller.result()

if result.styles and any([style.is_handwritten for style in result.styles]):
    print("Document contains handwritten content")
else:
    print("Document does not contain handwritten content")

for page in result.pages:
    print(f"----Analyzing layout from page #{page.page_number}----")
    print(f"Page has width: {page.width} and height: {page.height}, measured with unit: {page.unit}")

    if page.lines:
        for line_idx, line in enumerate(page.lines):
            words = get_words(page, line)
            print(
                f"...Line # {line_idx} has word count {len(words)} and text '{line.content}' "
                f"within bounding polygon '{line.polygon}'"
            )

            for word in words:
                print(f"......Word '{word.content}' has a confidence of {word.confidence}")

    if page.selection_marks:
        for selection_mark in page.selection_marks:
            print(
                f"Selection mark is '{selection_mark.state}' within bounding polygon "
                f"'{selection_mark.polygon}' and has a confidence of {selection_mark.confidence}"
            )

if result.tables:
    for table_idx, table in enumerate(result.tables):
        print(f"Table # {table_idx} has {table.row_count} rows and " f"{table.column_count} columns")
        if table.bounding_regions:
            for region in table.bounding_regions:
                print(f"Table # {table_idx} location on page: {region.page_number} is {region.polygon}")
        for cell in table.cells:
            print(f"...Cell[{cell.row_index}][{cell.column_index}] has text '{cell.content}'")
            if cell.bounding_regions:
                for region in cell.bounding_regions:
                    print(f"...content on page {region.page_number} is within bounding polygon '{region.polygon}'")

print("----------------------------------------")

#-------------------------LangChain--------------------------#

from langchain_community.document_loaders import AzureAIDocumentIntelligenceLoader

loader = AzureAIDocumentIntelligenceLoader(
    api_endpoint=endpoint, api_key=key, file_path=sample_file, api_model="prebuilt-layout"
)

documents = loader.load()

#-------------------------LangChain Cohere LLM--------------------------#
from langchain_cohere import ChatCohere, CohereRagRetriever
from langchain_core.documents import Document

cohere_key = os.environ["COHERE_API_KEY"]

# User query we will use for the generation
boilerplate = "You are a helpful AI assistant. Please answer each question on a separate line. Just give the answer and don't include any additional words."
if request == "cash_flows":
  user_query = boilerplate + "What is the most recent date of this cash flow document?"
elif request == "emails":
  user_query = boilerplate + "What is the date this email was sent? What is name of the sender? What is the name of the receiver? If you can find a dollar amount in the email, what is the dollar amount?"
elif request == "board_resolutions":
  user_query = boilerplate + "What is the date of this board resolution? What is the name of the company? What is the title of the resolution (for example, 'Director's Resolution')? If you can find a dollar amount in the board resolution, what is the dollar amount?"
elif request == "letters":
  user_query = boilerplate + "What is the date this letter was sent? What is name of the sender? What is the name of the receiver? If you can find a company name that the letter is associated with, what is the company name? If you can find a dollar amount in the email, what is the dollar amount?"
elif request == "income_statements":
  user_query = boilerplate + "What is the most recent year of this income statement?"
elif request == "remittances":
  user_query = boilerplate + "What is the date of this remittance? What is the name of the bank? What is the name of the sender? What is the name of the receiver? What is the remittance amount?"
elif request == "cheques":
  user_query = boilerplate + "What is the name of the bank? What is the name of the sender? What is the name of the receiver? What is the amount the check is made out for?"
elif request == "balance_sheets":
  user_query = boilerplate + "What is the most recent date on this balance sheet?"
elif request == "bank_statements":
  user_query = boilerplate + "What is the name of the bank? What is the name of the company or person of this bank statement? What is the first date on the document? What is the opening balance? What is the closing balance?"
else: 
  user_query = "Error classifying your document, please try again."

# Use Cohere's RAG retriever in document mode to generate an answer.
# Cohere provides exact citations for the sources it used.
llm = ChatCohere(cohere_api_key=cohere_key)
rag = CohereRagRetriever(llm=llm, connectors=[])

docs = rag.get_relevant_documents(
    user_query,
    documents=[
      documents[0]
    ],
)
answer = docs.pop()

print("Relevant documents:")
print(docs)

print(f"Question: {user_query}")
print("Answer:")
print(answer.page_content)
print(answer.metadata["citations"])
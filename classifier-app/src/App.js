import logo from './logo.png';
import pdfLogo from './pdf_logo.png';
import React, { useState, useEffect, useRef } from "react";
import { PrimeReactProvider } from 'primereact/api';
import 'primereact/resources/themes/mira/theme.css';
import { FileUpload } from 'primereact/fileupload';
import { ProgressBar } from 'primereact/progressbar';
import { Button } from 'primereact/button';
import classNames from 'classnames';
import { Tag } from 'primereact/tag';
import JSONToTable from './components/JSONToTable';
import CircularProgress from "@mui/material/CircularProgress";
import ClearOutlinedIcon from '@mui/icons-material/ClearOutlined';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import IconButton from '@mui/material/IconButton';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { onAuthStateChanged, getRedirectResult } from "firebase/auth";
import { auth } from "./firebase";
import SignIn from './components/SignIn';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [userId, setUserId] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [files, setFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [showPreviews, setShowPreviews] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0); 
  
  const firstRender = useFirstRender();
  const uploadRef = useRef(null);
  const panelRef = useRef(null);

  const clearFiles = () => {
    uploadRef.current.clear()
    setFiles([]);
  }

  function useFirstRender() {
    const ref = useRef(true);
    const firstRender = ref.current;
    ref.current = false;
    return firstRender;
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        setUserId(user.uid);
        console.log("User: ", user)
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const CLIENT_ID = `651980250715-rljbofutivj2erurrledrt88hafe643f.apps.googleusercontent.com`;
  const REDIRECT_URI = `http://127.0.0.1:3000`;

  // Parse query string to see if page request is coming from OAuth 2.0 server.
  const parseOAuthParams = () => {
    var fragmentString = window.location.hash.substring(1);
    var params = {};
    var regex = /([^&=]+)=([^&]*)/g, m;
    while (m = regex.exec(fragmentString)) {
      params[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);
    }
    if (Object.keys(params).length > 0 && params['state']) {
      console.log("params state: ", params['state'])
      console.log("local storage state: ", localStorage.getItem('state'))
      if (params['state'] == localStorage.getItem('state')) {
        localStorage.setItem('oauth2-test-params', JSON.stringify(params));
        window.location.hash = ''; // Clear the URL fragment
      } else {
        console.log('State mismatch. Possible CSRF attack');
      }
    }
  }

  useEffect(() => {
    parseOAuthParams();
  }, []);

  // Function to generate a random state value
  function generateCryptoRandomState() {
    const randomValues = new Uint32Array(2);
    window.crypto.getRandomValues(randomValues);

    // Encode as UTF-8
    const utf8Encoder = new TextEncoder();
    const utf8Array = utf8Encoder.encode(
      String.fromCharCode.apply(null, randomValues)
    );

    // Base64 encode the UTF-8 data
    return btoa(String.fromCharCode.apply(null, utf8Array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  // MARK: oauth2SignIn

  /*
   * Create form to request access token from Google's OAuth 2.0 server.
   */
  function oauth2SignIn() {
    // create random state value and store in local storage
    var state = generateCryptoRandomState();
    localStorage.setItem('state', state);

    // Google's OAuth 2.0 endpoint for requesting an access token
    var oauth2Endpoint = 'https://accounts.google.com/o/oauth2/v2/auth';

    // Create element to open OAuth 2.0 endpoint in new window.
    var form = document.createElement('form');
    form.setAttribute('method', 'GET'); // Send as a GET request.
    form.setAttribute('action', oauth2Endpoint);

    // Parameters to pass to OAuth 2.0 endpoint.
    var params = {'client_id': CLIENT_ID,
                  'redirect_uri': REDIRECT_URI,
                  'scope': 'https://www.googleapis.com/auth/drive.file',
                  'state': state,
                  'include_granted_scopes': 'true',
                  'response_type': 'code',
                  'access_type': 'offline'} // Request offline access to receive a refresh token;

    // Add form parameters as hidden input values.
    for (var p in params) {
      var input = document.createElement('input');
      input.setAttribute('type', 'hidden');
      input.setAttribute('name', p);
      input.setAttribute('value', params[p]);
      form.appendChild(input);
    }

    // Add form to page and submit it to open the OAuth 2.0 endpoint.
    document.body.appendChild(form);
    form.submit();
  }

  async function exchangeCodeForTokens(authCode) {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code: authCode,
        client_id: CLIENT_ID,
        client_secret: process.env.REACT_APP_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });
  
    const data = await response.json();
    if (data.access_token && data.refresh_token) {
      await fetch('/store-refresh-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: data.refresh_token }),
      });

      localStorage.setItem('oauth2-test-params', JSON.stringify(data));
      setAccessToken(data.access_token);
    } else {
      console.error('Failed to exchange authorization code for tokens:', data);
    }
  }

  async function refreshAccessToken(userId) {
    const response = await fetch(`/get-refresh-token/${userId}`);
    const data = await response.json();
  
    if (data.refresh_token) {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          client_secret: process.env.REACT_APP_CLIENT_SECRET,
          refresh_token: data.refresh_token,
          grant_type: 'refresh_token',
        }),
      });
  
      const tokenData = await tokenResponse.json();
      console.log("tokenData: ", tokenData)
      if (tokenData.access_token) {
        localStorage.setItem('oauth2-test-params', JSON.stringify({
          ...JSON.parse(localStorage.getItem('oauth2-test-params')),
          access_token: tokenData.access_token
        }));
        setAccessToken(tokenData.access_token);
      } else {
        console.error('Failed to refresh access token:', tokenData);
      }
    } else {
      console.error('Failed to retrieve refresh token:', data);
    }
  }

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const authCode = urlParams.get('code');
    if (authCode) {
      exchangeCodeForTokens(authCode);
    }
  }, []);

  // Refresh access token every 55 minutes
  useEffect(() => {
    if (accessToken) {
      const interval = setInterval(() => {
        refreshAccessToken(userId);
      }, 55 * 60 * 1000); // 55 minutes
      return () => clearInterval(interval);
    }
  }, [accessToken, userId]);

  
  // MARK: getOrCreateFolder

  const getOrCreateFolder = async (accessToken) => {
    const folderName = 'Gao Document Classification Files';

    try {
      const searchResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (searchResponse.ok) {
        const searchResult = await searchResponse.json();
        if (searchResult.files && searchResult.files.length > 0) {
          return searchResult.files[0].id;
        } else {
          const createResponse = await fetch(
            'https://www.googleapis.com/drive/v3/files',
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder',
              }),
            }
          );

          if (createResponse.ok) {
            const createResult = await createResponse.json();
            return createResult.id;
          } else {
            console.error('Error creating folder:', createResponse.statusText);
            return null;
          }
        }
      } else {
        console.error('Error searching for folder:', searchResponse.statusText);
        oauth2SignIn();
        return null;
      }
    } catch (error) {
      console.error('Error searching or creating folder:', error);
      return null;
    }
  };


  const documentUploadHandler = ({files}) => {
    const newFiles = Array.from(files).map(file => ({
      id: uuidv4(),
      file,
      name: file.name,
      docType: '',
      confidence: 0,
      info: {},
      classLoading: true,
      infoLoading: false,
    }));

    newFiles.forEach(fileData => uploadDoc(fileData));
    setFiles(prevFiles => [...prevFiles, ...newFiles]);
  };

  // MARK: uploadDoc

  const uploadDoc = async (document) => {
    const { id, file } = document;

    const metadata = {
      name: file.name,
      mimeType: file.docType,
    };

    const params = JSON.parse(localStorage.getItem('oauth2-test-params'));
    if (params && params['access_token']) {
      const accessToken = params['access_token'];

      const folderId = await getOrCreateFolder(accessToken);

      if (!folderId) {
        console.error('Failed to get or create folder');
        return;
      }

      metadata.parents = [folderId]; // Set the parent folder ID

      const form = new FormData();
      form.append(
        'metadata',
        new Blob([JSON.stringify(metadata)], { type: 'application/json' })
      );
      form.append('file', file);

      // MARK: upload to drive

      try {
        const response = await fetch(
          'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            onUploadProgress: (progressEvent) => {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(progress);
              console.log("progress: ", progress)
            },
            body: form,
          }
        );

        if (response.ok) {
          const jsonResponse = await response.json();
          console.log('File uploaded successfully:', jsonResponse);
          const fileId = jsonResponse.id;
          console.log("fileID: ", fileId)
          
          // MARK: send to backend
        
          try {
            const response = await axios.post('http://127.0.0.1:8000/api/upload', {
              file_id: fileId,
              access_token: accessToken,
              name: file.name,
            });
            if (response.status === 200) {
              console.log('Classification result:', response.data);
            } else {
              console.error('Error calling backend:', response.statusText);
            }

            const updatedFileData = {
              ...document,
              file_id: fileId,
              docType: response.data.classification,
              confidence: response.data.confidence,
              classLoading: false,
              infoLoading: true,
            };
            setFiles(prevFiles => prevFiles.map(file => file.id === id ? updatedFileData : file));
            console.log("File array: " + files)
            console.log("Doc type: " + response.data.classification + ", Confidence:" + response.data.confidence);
            console.log("File name: " + file.name);

            // MARK: extract info

            try {
              let result = await axios.get(`http://127.0.0.1:8000/api/info?file_id=${fileId}`);
              console.log("result.data: ", result.data);
              let name = result.data.file_name;
              let json_str = "{"+((result.data)['json']).substring(11, ((result.data)['json']).length - 6)+"}";
              console.log("json_str:");
              console.log(json_str)
      
              let file_name_json = {"file_name": name};
              console.log("file_name_json:");
              console.log(file_name_json);
      
              let parsedJson = JSON.parse(json_str);
              console.log("parsed json:");
              console.log(parsedJson);
      
              let total_json = Object.assign(file_name_json, parsedJson);
              console.log("total json:")
              console.log(total_json)
              
              const updatedFileInfo = {
                ...updatedFileData,
                info: total_json,
                infoLoading: false,
            };
            setFiles(prevFiles => prevFiles.map(file => file.id === id ? updatedFileInfo : file));
          } catch (error) { 
            setFiles(prevFiles => prevFiles.map(file => file.id === id ? { ...file, infoLoading: false } : file));
            console.warn('Error fetching info:', error);
          }
    
          } catch (error) {
            setFiles(prevFiles => prevFiles.map(file => file.id === id ? { ...file, classLoading: false } : file));
            console.warn('Error uploading file:', error);
            alert('Error uploading file');
          }

        } else {
          console.error('Error uploading file:', response.statusText);
          if (response.status === 401) {
            console.log("error with response.ok")
            // oauth2SignIn();
          }
        }
      } catch (error) {
        console.error('Error uploading file:', error);
      }
    } else {
      oauth2SignIn();
    }
  };

  // MARK: Checkbox and previews

  const handleCheckboxChange = (file) => {
    console.log("selected files: ", selectedFiles);
    setSelectedFiles(prevSelectedFiles => {
      if (prevSelectedFiles.includes(file)) {
        return prevSelectedFiles.filter(selectedFile => selectedFile !== file);
      } else {
        return [...prevSelectedFiles, file];
      }
    });
  };

  function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
  }

  const handleShowPreviews = () => {
    setShowPreviews(true);
  };

  const handleClosePreviews = () => {
    const panel = panelRef.current;
    setShowPreviews(false);
    if (panel.offsetWidth < 500) {
      delay(600).then(() => panel.style.width = '500px');
    } else {
      panel.style.width = '500px'
    }
  };

  const itemTemplate = (file, props) => {
    var display_image;

    if (file.type === 'application/pdf') {
      display_image=<img alt={"pdf logo"} role="presentation" src={pdfLogo} width={40} />
    } else{
      display_image=<img alt={""} role="presentation" src={file.objectURL} width={40} />
    }
    return (
        <div className="flex items-center flex-wrap grid-cols-3 gap-6 ">
          <div className="flex align-items-center max-h-28">
            {display_image}
          </div>
          <div className='flex items-center'>
            <span className="flex flex-column text-left ml-3">{file.name}</span>
          </div>
          <div className='flex items-center'>
            <Tag value={props.formatSize} severity="success" className="px-3 py-2" />
          </div>
        </div>
    )
  }

  const handleMouseDown = (e) => {
    const panel = panelRef.current;
    const startX = e.clientX;
    const minWidth = 350;
    const startWidth = panel.offsetWidth;
  
    const onMouseMove = (e) => {
      const newWidth = Math.max(minWidth, startWidth - (e.clientX - startX));
      panel.style.width = `${newWidth}px`;
    };
  
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };
  
  const groupFilesByDocType = (files) => {
    return files.reduce((acc, file) => {
      const { docType } = file;
      if (!acc[docType]) {
        acc[docType] = [];
      }
      acc[docType].push(file);
      return acc;
    }, {});
  };

  const groupedFiles = groupFilesByDocType(files);
  const allFilesLoaded = files.every(file => !file.classLoading && !file.infoLoading);

  // MARK: render

  return (
    <PrimeReactProvider>
    <div>
      <header className="Gao Document Classification">
        <div className='mx-2 grid grid-cols-[1fr_max-content_1fr] p-2'>
          <div className="col-start-2">
            <img src={logo} className="app-logo" alt="logo" />
          </div>
          {user ? (
            <div className="flex flex-col mt-8 mr-10 justify-self-end">
              <h1 className='dm-sans-heading text-l flex justify-center'>Welcome, {user.displayName}</h1>
              <Button label="Sign Out" onClick={() => auth.signOut()} className="sign-out-button fill"/>
            </div>
          ) : (
            <SignIn />
          )}
        </div>
        <div className="flex justify-center dm-sans-title mt-12">
          <h1 className="text-3xl">Document Classifier</h1>
        </div>
        <div>
          <p className="flex justify-center dm-sans-body mt-3">Powered by Azure Document Intelligence, LangChain, and Cohere.</p>
        </div>
        <div>
          <p className="flex justify-center dm-sans-body mt-1">Built with ReactJS, Flask, and Axios.</p>
        </div>
        <div className="flex justify-center dm-sans-heading mt-12">
          <h1 className="text-xl">Upload a Document</h1>
        </div>
        <div>
          <p className="flex justify-center dm-sans-body mt-3">Please make sure that your file is a pdf, png, or jpeg. The maximimum file size is 4 MB.</p>
        </div>
        <div className = "flex justify-center">
          <FileUpload name="document" ref={uploadRef} customUpload multiple uploadHandler={documentUploadHandler} auto 
          url={'/api/upload'} accept="image/jpeg,image/png,application/pdf" maxFileSize={4000000} itemTemplate={itemTemplate}
          progressBarTemplate=
          {(files.size > 0) ? (
            <ProgressBar value={uploadProgress} style={{height: '4px'}}></ProgressBar>
          ) : (
            <ProgressBar value={uploadProgress} style={{height: '0px'}}></ProgressBar>
          )}
          emptyTemplate={<p className="mt-[-7%]">Drag and drop files to here to upload.</p>} 
          pt = {{
            content: { className: files.length===0 ? ('justify-center relative items-center bg-slate-100') : ('justify-center relative bg-slate-100 mb-4') },
            file: { className: classNames('flex items-center flex-wrap w-72 h-28', 'border border-gray-300 border-2 rounded gap-2 gap-x-2 mb-2 mr-2')},
            chooseButton: { className: 'choose-button fill2 flex items-center'},
            chooseIcon: { className: 'ml-3'},
          }}
          />
        </div>
        <div className='flex justify-center mt-4'>
            <Button label="Clear" icon={(options) => <ClearOutlinedIcon {...options.iconProps} />} className='clear-button fill'
            onClick={clearFiles}
            pt={{
              icon: {className: 'ml-2'},
            }}/>
        </div>
        <div className="flex justify-center dm-sans-heading mt-10">
          <h1 className="text-xl">Classification Result</h1>
        </div>
        {files.map((file) => (
            <div key={file.id} className='mt-4 dm-sans-body flex justify-center'>
              <p>
                <span className="code">{file.name}</span> falls under {" "}
                <span className='code'>
                  {file.classLoading ? (
                    <CircularProgress color="inherit" size={12} thickness={4} />
                  ) : (
                    file.docType
                  )}
                </span>
                {" "} with a confidence of {" "}
                <span className='code'>
                  {file.classLoading ? (
                    <CircularProgress color="inherit" size={12} thickness={4} />
                  ) : (
                    file.confidence
                  )}
                </span>
                .
              </p>
            </div>
          ))}
        <div className="flex justify-center dm-sans-heading mt-10 mb-4">
          <h1 className="text-xl">Information Extraction</h1>
        </div>
        <div>
          <p className="flex justify-center dm-sans-body mt-3">Information is grouped by document type.</p>
        </div>
        <div>
          <p className="flex justify-center dm-sans-body mt-3 mb-4">Click the checkboxes next to the file names to preview those files.</p>
        </div>
        {Object.entries(groupedFiles).map(([docType, files]) => (
          <div key={docType} className="flex flex-col items-center mt-4 mb-10">
            <h1 className="text-x mb-2 dm-sans-heading">{docType}</h1>
            {files.some(file => file.infoLoading || !file.info) ? (
              <CircularProgress className="mt-8" color="inherit" size={20} thickness={6} />
            ) : (
              <JSONToTable data={files.map(file => file.info)} selectedFiles={selectedFiles}
              handleCheckboxChange={handleCheckboxChange}/>
            )}
          </div>
        ))}
        
        {allFilesLoaded && (
          <div className="flex justify-center mt-4 mb-8">
            <Button label="Show Previews" icon={(options) => <ArticleOutlinedIcon {...options.iconProps} />} className='show-previews-button fill3'
              onClick={handleShowPreviews}
            />
          </div>
        )}

        <div ref={panelRef} className={`sliding-panel ${showPreviews ? 'open' : ''}`}>
        <div className="resizer" onMouseDown={handleMouseDown}></div>
          <div className="sticky top-0 bg-white w-full z-10">
            <div className="inline-block w-10">
              <IconButton aria-label="delete" size="large" onClick={handleClosePreviews}>
                <CloseOutlinedIcon fontSize="small" />
              </IconButton>
            </div>
          </div>
          <div className="flex flex-col items-center mb-10 h-screen">
            <h1 className="dm-sans-heading text-xl mb-4">File Previews</h1>
            {selectedFiles.map((fileName, index) => {
              const file = files.find(f => f.name === fileName);
              if (file) {
                const embedUrl = `https://drive.google.com/file/d/${file.file_id}/preview`;
                return (
                  <div key={index} className="flex flex-col items-center w-full h-screen">
                    <h2 className = "flex justify-center dm-sans-heading mb-4">{fileName}</h2>
                    {file.file.type === "application/pdf" ? (
                      <iframe src={embedUrl} width="90%" height="600" className="mb-8"></iframe>
                    ) : (
                      <iframe src={embedUrl} width="90%" height="600" className="mb-8"></iframe>
                    )}
                  </div>
                );
              }
              return null;
            })}
          </div>
        </div>
      </header>
      </div>
    </PrimeReactProvider>
  );
}

export default App;

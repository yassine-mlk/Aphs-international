import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function TestUpload() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [useSignedUrl, setUseSignedUrl] = useState(true);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setUploadResult(null);
    setUploadError(null);
  };

  const handleMethodChange = () => {
    setUseSignedUrl(!useSignedUrl);
  };

  const uploadViaSignedUrl = async () => {
    if (!file) return;
    
    setUploading(true);
    setUploadResult(null);
    setUploadError(null);

    try {
      // 1. Generate a unique file name
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `test_${timestamp}.${fileExt}`;
      
      // 2. Get a signed URL for upload
      console.log("Creating signed URL...");
      const { data: signedURLData, error: signedURLError } = await supabase.storage
        .from('task_submissions')
        .createSignedUploadUrl(fileName);
      
      if (signedURLError) {
        throw new Error(`Signed URL error: ${signedURLError.message}`);
      }
      
      // 3. Use the signed URL to upload
      console.log("Uploading with signed URL:", signedURLData);
      const { signedUrl, path } = signedURLData;
      
      const uploadResponse = await fetch(signedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });
      
      if (!uploadResponse.ok) {
        throw new Error(`Upload failed with status: ${uploadResponse.status}`);
      }
      
      // 4. Get the public URL
      const { data: urlData } = supabase.storage
        .from('task_submissions')
        .getPublicUrl(path);
      
      setUploadResult({
        success: true,
        url: urlData.publicUrl,
        path: path
      });
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(`${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const uploadDirectMethod = async () => {
    if (!file) return;
    
    setUploading(true);
    setUploadResult(null);
    setUploadError(null);

    try {
      // 1. Generate a unique file name
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `test_${timestamp}.${fileExt}`;
      
      // 2. Direct upload
      console.log("Uploading directly...");
      const { data, error } = await supabase.storage
        .from('task_submissions')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (error) {
        throw error;
      }
      
      // 3. Get the public URL
      const { data: urlData } = supabase.storage
        .from('task_submissions')
        .getPublicUrl(data.path);
      
      setUploadResult({
        success: true,
        url: urlData.publicUrl,
        path: data.path
      });
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(`${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleUpload = async () => {
    if (useSignedUrl) {
      await uploadViaSignedUrl();
    } else {
      await uploadDirectMethod();
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h1>Test File Upload</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <label>
          <input 
            type="checkbox" 
            checked={useSignedUrl} 
            onChange={handleMethodChange} 
          />
          Use Signed URL Method
        </label>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <input 
          type="file" 
          onChange={handleFileChange}
          disabled={uploading}
        />
      </div>
      
      <button 
        onClick={handleUpload} 
        disabled={!file || uploading}
        style={{
          padding: '10px 15px',
          background: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: file && !uploading ? 'pointer' : 'not-allowed',
          opacity: file && !uploading ? 1 : 0.7
        }}
      >
        {uploading ? 'Uploading...' : 'Upload File'}
      </button>
      
      {uploadResult && (
        <div style={{ marginTop: '20px', padding: '15px', background: '#DFF2BF', borderRadius: '4px' }}>
          <h3>Upload Successful!</h3>
          <p><strong>Path:</strong> {uploadResult.path}</p>
          <p><strong>URL:</strong> <a href={uploadResult.url} target="_blank" rel="noreferrer">{uploadResult.url}</a></p>
        </div>
      )}
      
      {uploadError && (
        <div style={{ marginTop: '20px', padding: '15px', background: '#FFBABA', borderRadius: '4px' }}>
          <h3>Upload Failed</h3>
          <p>{uploadError}</p>
        </div>
      )}
    </div>
  );
}

export default TestUpload; 
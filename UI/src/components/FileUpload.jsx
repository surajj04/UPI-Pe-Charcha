import axios from 'axios'
import React, { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const FileUploadComponent = ({ onUploadSuccess }) => {
  const navigate = useNavigate()
  const [file, setFile] = useState(null)
  const [draggedOver, setDraggedOver] = useState(false)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const fileInputRef = useRef(null)

  // Check if data exists on component mount
  useEffect(() => {
    const storedData = localStorage.getItem('data')
    if (!storedData) {
      navigate('/')
    }
  }, [navigate])

  const isValidFile = file => {
    return file.type === 'application/pdf'
  }

  const handleFileInputChange = e => {
    const selectedFile = e.target.files[0]
    if (!selectedFile) return

    if (!isValidFile(selectedFile)) {
      setError('Please upload a PDF file only')
      return
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      // 5MB limit
      setError('File size must be less than 5MB')
      return
    }

    setError('')
    setFile(selectedFile)
    setUploadSuccess(false)
  }

  const handleButtonClick = () => {
    fileInputRef.current.click()
  }

  const handleDrop = e => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]

    if (!droppedFile) {
      setError('No file was dropped')
      setDraggedOver(false)
      return
    }

    if (!isValidFile(droppedFile)) {
      setError('Please upload a PDF file only')
      setDraggedOver(false)
      return
    }

    if (droppedFile.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB')
      setDraggedOver(false)
      return
    }

    setError('')
    setFile(droppedFile)
    setUploadSuccess(false)
    setDraggedOver(false)
  }

  const handleDragEnter = e => {
    e.preventDefault()
    if (e.dataTransfer.items.length > 1) {
      setError('Only one file allowed')
    }
    setDraggedOver(true)
  }

  const handleDragLeave = () => {
    setDraggedOver(false)
  }

  const handleDragOver = e => {
    e.preventDefault()
  }

  const handleDelete = () => {
    setFile(null)
    setError('')
    setUploadSuccess(false)
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!file) {
      setError('Please select a PDF file to upload')
      return
    }
    setUploading(true)
    setError('')
    setUploadSuccess(false)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await axios.post(
        'http://127.0.0.1:8000/analysis/upload',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          timeout: 30000,
          onUploadProgress: progressEvent => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            )
            console.log(percentCompleted)
          }
        }
      )

      if (!res.data) {
        throw new Error('Invalid server response')
      }
      const responseData = res.data
      localStorage.removeItem('data')
      localStorage.setItem('data', JSON.stringify(responseData))
      setUploadSuccess(true)
      setError('')
      if (onUploadSuccess) {
        onUploadSuccess(responseData)
      }
      // Use navigate instead of window.location.href
      // navigate('/report')
      window.location.href = '/report'
    } catch (error) {
      console.error('Upload failed:', error)

      let errorMessage = 'File upload failed'
      if (error.response) {
        if (error.response.status === 400) {
          errorMessage = error.response.data?.detail || 'Invalid file format'
        } else if (error.response.status === 413) {
          errorMessage = 'File too large (max 5MB allowed)'
        } else if (error.response.status === 401) {
          errorMessage = 'Authentication required'
        } else {
          errorMessage =
            error.response.data?.message ||
            `Server error (${error.response.status})`
        }
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out - please try again'
      } else if (error.message === 'Invalid server response') {
        errorMessage = 'Server returned invalid data'
      } else if (error.request) {
        errorMessage = 'No response from server - please check your connection'
      }

      setError(errorMessage)
      setUploadSuccess(false)
    } finally {
      setUploading(false)
    }
  }

  const handleCancel = () => {
    setFile(null)
    setError('')
    setUploadSuccess(false)
  }

  const formatFileSize = size => {
    if (size > 1024) {
      return size > 1048576
        ? Math.round(size / 1048576) + ' MB'
        : Math.round(size / 1024) + ' KB'
    }
    return size + ' B'
  }

  return (
    <div className='min-h-screen w-screen sm:px-8 md:px-16 sm:py-8 bg-gray-50'>
      <main className='container mx-auto max-w-screen-lg h-full'>
        <article
          className='relative h-full flex flex-col bg-white shadow-xl rounded-md'
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDragEnter={handleDragEnter}
        >
          {/* Overlay */}
          <div
            className={`w-full h-full absolute top-0 left-0 pointer-events-none z-50 flex flex-col items-center justify-center rounded-md transition-opacity ${
              draggedOver ? 'bg-white bg-opacity-70' : ''
            }`}
          >
            {draggedOver && (
              <>
                <i>
                  <svg
                    className='fill-current w-12 h-12 mb-3 text-blue-700'
                    xmlns='http://www.w3.org/2000/svg'
                    width='24'
                    height='24'
                    viewBox='0 0 24 24'
                  >
                    <path d='M19.479 10.092c-.212-3.951-3.473-7.092-7.479-7.092-4.005 0-7.267 3.141-7.479 7.092-2.57.463-4.521 2.706-4.521 5.408 0 3.037 2.463 5.5 5.5 5.5h13c3.037 0 5.5-2.463 5.5-5.5 0-2.702-1.951-4.945-4.521-5.408zm-7.479-1.092l4 4h-3v4h-2v-4h-3l4-4z' />
                  </svg>
                </i>
                <p className='text-lg text-blue-700'>Drop PDF file to upload</p>
              </>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className='bg-red-100 border-l-4 border-red-500 text-red-700 p-4'>
              <p>{error}</p>
            </div>
          )}

          {/* Success Message */}
          {uploadSuccess && (
            <div className='bg-green-100 border-l-4 border-green-500 text-green-700 p-4'>
              <p>File uploaded successfully!</p>
            </div>
          )}

          {/* Scroll area */}
          <section className='h-full overflow-auto p-8 w-full flex flex-col'>
            <header className='border-dashed border-2 border-gray-400 py-12 flex flex-col justify-center items-center'>
              <p className='mb-3 font-semibold text-gray-900 text-center'>
                Drag and drop a single PDF file here or
              </p>
              <input
                id='hidden-input'
                type='file'
                accept='.pdf,application/pdf'
                className='hidden'
                ref={fileInputRef}
                onChange={handleFileInputChange}
              />
              <button
                onClick={handleButtonClick}
                disabled={uploading}
                className='mt-2 rounded-sm px-3 py-1 bg-gray-200 hover:bg-gray-300 focus:shadow-outline focus:outline-none disabled:opacity-50'
              >
                Select PDF file
              </button>
              <p className='mt-2 text-sm text-gray-500'>
                Only PDF files under 5MB are accepted
              </p>
            </header>

            <h1 className='pt-8 pb-3 font-semibold sm:text-lg text-gray-900'>
              File to Upload
            </h1>

            <div className='flex flex-1 flex-wrap -m-1'>
              {!file ? (
                <div className='h-full w-full text-center flex flex-col items-center justify-center'>
                  <img
                    className='mx-auto w-32'
                    src='https://user-images.githubusercontent.com/507615/54591670-ac0a0180-4a65-11e9-846c-e55ffce0fe7b.png'
                    alt='no data'
                  />
                  <span className='text-small text-gray-500'>
                    No file selected
                  </span>
                </div>
              ) : (
                <div className='block p-1 w-full'>
                  <article
                    tabIndex='0'
                    className='group w-full rounded-md focus:outline-none focus:shadow-outline bg-gray-100 cursor-pointer relative shadow-sm p-4'
                  >
                    <div className='flex items-center'>
                      <div className='p-2 rounded-full bg-blue-100 text-blue-600 mr-4'>
                        <svg
                          className='fill-current w-6 h-6'
                          xmlns='http://www.w3.org/2000/svg'
                          width='24'
                          height='24'
                          viewBox='0 0 24 24'
                        >
                          <path d='M14 2h-8v-2h8v2zm6.667 20.333c0 .368-.299.667-.667.667h-16c-.368 0-.667-.299-.667-.667v-16c0-.368.299-.667.667-.667h5.333v4.667c0 .368.299.667.667.667h5.333v11.333zm-4-14.333v-4.333l4.333 4.333h-4.333z' />
                        </svg>
                      </div>
                      <div className='flex-1'>
                        <h1 className='text-sm font-medium text-gray-900'>
                          {file.name}
                        </h1>
                        <p className='text-xs text-gray-500'>
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                      <button
                        onClick={handleDelete}
                        disabled={uploading}
                        className='ml-auto focus:outline-none hover:bg-gray-300 p-2 rounded-md text-gray-800 disabled:opacity-50'
                      >
                        <svg
                          className='pointer-events-none fill-current w-5 h-5'
                          xmlns='http://www.w3.org/2000/svg'
                          width='24'
                          height='24'
                          viewBox='0 0 24 24'
                        >
                          <path d='M3 6l3 18h12l3-18h-18zm19-4v2h-20v-2h5.711c.9 0 1.631-1.099 1.631-2h5.316c0 .901.73 2 1.631 2h5.711z' />
                        </svg>
                      </button>
                    </div>
                  </article>
                </div>
              )}
            </div>
          </section>

          {/* Footer */}
          <footer className='flex justify-end px-8 pb-8 pt-4'>
            <button
              onClick={handleSubmit}
              disabled={!file || uploading}
              className={`rounded-sm px-3 py-1 ${
                file && !uploading
                  ? 'bg-blue-700 hover:bg-blue-500'
                  : 'bg-gray-400 cursor-not-allowed'
              } text-white focus:shadow-outline focus:outline-none`}
            >
              {uploading ? (
                <span className='flex items-center'>
                  <svg
                    className='animate-spin -ml-1 mr-2 h-4 w-4 text-white'
                    xmlns='http://www.w3.org/2000/svg'
                    fill='none'
                    viewBox='0 0 24 24'
                  >
                    <circle
                      className='opacity-25'
                      cx='12'
                      cy='12'
                      r='10'
                      stroke='currentColor'
                      strokeWidth='4'
                    ></circle>
                    <path
                      className='opacity-75'
                      fill='currentColor'
                      d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                    ></path>
                  </svg>
                  Uploading...
                </span>
              ) : (
                'Upload now'
              )}
            </button>
            <button
              onClick={handleCancel}
              disabled={uploading}
              className='ml-3 rounded-sm px-3 py-1 hover:bg-gray-300 focus:shadow-outline focus:outline-none disabled:opacity-50'
            >
              Cancel
            </button>
          </footer>
        </article>
      </main>
    </div>
  )
}

export default FileUploadComponent

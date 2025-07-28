import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom'
import FileUploadComponent from './components/FileUpload'
import Report from './components/Report'
import Navbar from './components/Navbar' // Import the Navbar component

function App () {
  return (
    <Router>
      <div className='min-h-screen bg-gray-50'>
        {' '}
        {/* Added container div */}
        <Navbar onFileUpload={handleFileUpload} onClearData={handleClearData} />
        <Routes>
          <Route path='/' element={<FileUploadComponent />} />
          <Route
            path='/report'
            element={
              <ProtectedRoute>
                <ReportWrapper />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </Router>
  )
}

// Add these handler functions
const handleFileUpload = file => {
  // This should match your existing file upload logic
  // You might want to move this to FileUploadComponent instead
  console.log('File to upload:', file)
}

const handleClearData = () => {
  localStorage.removeItem('data')
  window.location.href = '/'
}

function ProtectedRoute ({ children }) {
  const storedData = localStorage.getItem('data')

  if (!storedData) {
    return <Navigate to='/' replace />
  }

  return children
}

function ReportWrapper () {
  const storedData = JSON.parse(localStorage.getItem('data'))
  return <Report data={storedData} />
}

export default App

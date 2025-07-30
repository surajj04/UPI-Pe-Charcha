import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FiUpload, FiFileText, FiTrash2, FiPlus } from 'react-icons/fi'

const Navbar = ({ onFileUpload, onClearData }) => {
  const [hasData, setHasData] = useState(false)

  useEffect(() => {
    // Check if data exists in localStorage
    const data = localStorage.getItem('data')
    setHasData(!!data)

    // Listen for storage changes (in case another tab modifies it)
    const handleStorageChange = () => {
      const updatedData = localStorage.getItem('data')
      setHasData(!!updatedData)
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const handleFileChange = e => {
    const file = e.target.files[0]
    if (file) {
      onFileUpload(file)
    }
  }

  const handleClearData = () => {
    localStorage.removeItem('data')
    setHasData(false)
    onClearData()
  }

  return (
    <nav className='bg-white shadow-sm'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex justify-between h-16'>
          <div className='flex items-center'>
            <Link
              to='/'
              className='text-xl font-semibold text-gray-800 hover:text-gray-600'
            >
              UPI-Pe-Charcha
            </Link>
          </div>

          <div className='flex items-center space-x-4'>
            {hasData ? (
              <>
                <button
                  onClick={handleClearData}
                  className='flex items-center px-3 py-2 text-sm font-medium rounded-md text-red-600 hover:bg-red-50 transition-colors'
                >
                  <FiTrash2 className='mr-2' />
                  Clear Report
                </button>
                <Link
                  to='/report'
                  className='flex items-center px-3 py-2 text-sm font-medium rounded-md text-blue-600 hover:bg-blue-50 transition-colors'
                >
                  <FiFileText className='mr-2' />
                  View Report
                </Link>
              </>
            ) : (
              <Link
                to='/'
                className='flex items-center px-3 py-2 text-sm font-medium rounded-md text-blue-600 hover:bg-blue-50 transition-colors'
              >
                <FiUpload className='mr-2' />
                Upload PDF
              </Link>
            )}

            {hasData && (
              <Link
                to='/'
                className='flex items-center px-3 py-2 text-sm font-medium rounded-md text-green-600 hover:bg-green-50 transition-colors'
              >
                <FiPlus className='mr-2' />
                New Report
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar

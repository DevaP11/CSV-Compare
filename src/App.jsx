import React, { useState, useEffect } from 'react'
import Logo from '../public/logo.webp'
import { Upload, FileText, AlertCircle, Search } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'

export default function CSVComparator () {
  const [goReady, setGoReady] = useState(false)

  const [fileA, setFileA] = useState(null)
  const [fileB, setFileB] = useState(null)
  const [dataA, setDataA] = useState([])
  const [dataB, setDataB] = useState([])
  const [columnsA, setColumnsA] = useState([])
  const [columnsB, setColumnsB] = useState([])
  const [columnToCompareA, setColumnToCompareA] = useState('')
  const [columnToCompareB, setColumnToCompareB] = useState('')
  const [uniqueToA, setUniqueToA] = useState([])
  const [uniqueToB, setUniqueToB] = useState([])
  const [error, setError] = useState('')
  const [comparisonDone, setComparisonDone] = useState(false)

  useEffect(() => {
    async function initWasm () {
      try {
        const go = new window.Go()

        const wasm = await WebAssembly.instantiateStreaming(
          fetch('/main.wasm'),
          go.importObject
        )

        go.run(wasm.instance)

        // calls the Go function
        if (typeof window.sayHello !== 'function') {
          window.sayHello()
        }

        if (typeof window.parseCSV !== 'function') {
          setError('WASM loaded but parseCSV not found')
          return
        }

        setGoReady(true)
      } catch (err) {
        console.error('WASM load error:', err)
        setError('Failed to load WebAssembly module')
      }
    }

    initWasm()
  }, [])

  const handleFileUpload = async (file, isFileA) => {
    if (!file) return

    if (!goReady) {
      setError('WASM not ready yet')
      return
    }

    const csvText = await file.text()
    const response = window.parseCSV(csvText)

    let parsed
    try {
      parsed = JSON.parse(response)
    } catch (err) {
      setError('Invalid CSV: ' + err.message)
      return
    }

    if (parsed.error) {
      setError(parsed.error)
      return
    }

    const headers = parsed.headers
    const rows = parsed.rows

    if (isFileA) {
      setFileA(file.name)
      setColumnsA(headers)
      setDataA(rows)
    } else {
      setFileB(file.name)
      setColumnsB(headers)
      setDataB(rows)
    }

    setError('')
    setComparisonDone(false)
  }

  const handleCompare = () => {
    if (dataA.length === 0 || dataB.length === 0) {
      setError('Please upload both CSV files')
      return
    }

    if (!columnToCompareA || !columnToCompareB) {
      setError('Please specify the columns to compare in both files')
      return
    }

    if (!columnsA.includes(columnToCompareA)) {
      setError(`Column "${columnToCompareA}" not found in File A`)
      return
    }

    if (!columnsB.includes(columnToCompareB)) {
      setError(`Column "${columnToCompareB}" not found in File B`)
      return
    }

    setError('')

    // Create maps for quick lookup
    const mapA = new Map()
    const mapB = new Map()

    dataA.forEach(row => {
      const key = row[columnToCompareA]
      if (key !== undefined && key !== null && key !== '') {
        mapA.set(String(key).trim(), row)
      }
    })

    dataB.forEach(row => {
      const key = row[columnToCompareB]
      if (key !== undefined && key !== null && key !== '') {
        mapB.set(String(key).trim(), row)
      }
    })

    // Find rows unique to A
    const onlyInA = []
    mapA.forEach((row, key) => {
      if (!mapB.has(key)) {
        onlyInA.push(row)
      }
    })

    // Find rows unique to B
    const onlyInB = []
    mapB.forEach((row, key) => {
      if (!mapA.has(key)) {
        onlyInB.push(row)
      }
    })

    setUniqueToA(onlyInA)
    setUniqueToB(onlyInB)
    setComparisonDone(true)
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-red-50 to-beige-100 p-8'>
      <div className='max-w-7xl mx-auto'>
        <div className='flex justify-center p-0 m-0'>
          <img
            src={Logo}
            alt='Logo'
            decoding='async'
            fetchPriority='high'
            className='w-[30vh]'
          />
        </div>
        <p className='text-gray-600 text-center mb-8'>
          Upload two CSV files and specify columns to compare their rows
        </p>

        <div className='grid md:grid-cols-2 gap-6 mb-8'>
          <div className='bg-white rounded-lg shadow-md p-6'>
            <h2 className='text-xl font-extralight mb-4 flex items-center gap-2'>
              <FileText className='text-purple-600' size={24} />
              CSV File A
            </h2>
            <label className='flex flex-col items-center justify-center border-2 border-dashed border-purple-300 rounded-lg p-8 cursor-pointer hover:border-purple-500 transition-colors'>
              <Upload className='text-purple-500 mb-2' size={40} />
              <span className='text-sm text-gray-600 mb-2'>
                {fileA || 'Click to upload CSV A'}
              </span>
              <input
                type='file'
                accept='.csv'
                className='hidden'
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileUpload(file, true)
                }}
              />
            </label>
            {dataA.length > 0 && (
              <div className='mt-4 space-y-3'>
                <p className='text-sm font-medium text-gray-700'>
                  {dataA.length} rows, {columnsA.length} columns
                </p>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    Column to compare in File A:
                  </label>
                  <Select value={columnToCompareA} onValueChange={setColumnToCompareA}>
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder='Select a column...' />
                    </SelectTrigger>
                    <SelectContent>
                      {columnsA.map((col, idx) => (
                        <SelectItem key={idx} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          <div className='bg-white rounded-lg shadow-md p-6'>
            <h2 className='text-xl font-extralight mb-4 flex items-center gap-2'>
              <FileText className='text-violet-600' size={24} />
              CSV File B
            </h2>
            <label className='flex flex-col items-center justify-center border-2 border-dashed border-violet-300 rounded-lg p-8 cursor-pointer hover:border-violet-500 transition-colors'>
              <Upload className='text-violet-500 mb-2' size={40} />
              <span className='text-sm text-gray-600 mb-2'>
                {fileB || 'Click to upload CSV B'}
              </span>
              <input
                type='file'
                accept='.csv'
                className='hidden'
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileUpload(file, false)
                }}
              />
            </label>
            {dataB.length > 0 && (
              <div className='mt-4 space-y-3'>
                <p className='text-sm font-medium text-gray-700'>
                  {dataB.length} rows, {columnsB.length} columns
                </p>
                <div>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    Column to compare in File B:
                  </label>
                  <Select value={columnToCompareB} onValueChange={setColumnToCompareB}>
                    <SelectTrigger className='w-full'>
                      <SelectValue placeholder='Select a column...' />
                    </SelectTrigger>
                    <SelectContent>
                      {columnsB.map((col, idx) => (
                        <SelectItem key={idx} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </div>

        {dataA.length > 0 && dataB.length > 0 && (
          <div className='flex justify-center mb-8'>
            <button
              onClick={handleCompare}
              className='bg-gradient-to-r from-purple-600 to-violet-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-violet-700 transition-all shadow-lg flex items-center gap-2'
            >
              <Search size={20} />
              Compare Files
            </button>
          </div>
        )}

        {error && (
          <div className='bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3'>
            <AlertCircle className='text-red-600 flex-shrink-0' size={20} />
            <p className='text-red-800 text-sm'>{error}</p>
          </div>
        )}

        {comparisonDone && (
          <div className='bg-green-50 border border-green-200 rounded-lg p-4 mb-6'>
            <p className='text-green-800 text-sm font-medium'>
              Comparison complete!
            </p>
          </div>
        )}

        {comparisonDone && (
          <div className='space-y-6'>
            <div className='bg-white rounded-lg shadow-md p-6'>
              <h3 className='text-lg font-light mb-4 text-black-700 flex items-center gap-2'>
                Rows in A which are not there in B
                <span className='text-sm bg-red-100 text-grey-800 px-2 py-1 rounded-full'>
                  {uniqueToA.length}
                </span>
              </h3>
              {uniqueToA.length > 0
                ? (
                  <div className='overflow-auto max-h-96'>
                    <table className='w-full text-sm border-collapse'>
                      <thead className='bg-purple-50 sticky top-0'>
                        <tr>
                          {columnsA.map((col, idx) => (
                            <th key={idx} className='text-left p-3 font-medium text-gray-700 border-b-2 border-purple-200 whitespace-nowrap'>
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {uniqueToA.map((row, idx) => (
                          <tr key={idx} className='border-b border-gray-200 hover:bg-purple-50'>
                            {columnsA.map((col, colIdx) => (
                              <td key={colIdx} className='p-3 text-gray-800 whitespace-nowrap'>
                                {row[col] !== undefined && row[col] !== null ? String(row[col]) : ''}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  )
                : (
                  <p className='text-gray-500 italic'>No unique rows found. All values in File A exist in File B.</p>
                  )}
            </div>

            <div className='bg-white rounded-lg shadow-md p-6'>
              <h3 className='text-lg font-light mb-4 text-black-700 flex items-center gap-2'>
                Rows in B which are not there in A
                <span className='text-sm bg-red-100 text-black-800 px-2 py-1 rounded-full'>
                  {uniqueToB.length}
                </span>
              </h3>
              {uniqueToB.length > 0
                ? (
                  <div className='overflow-auto max-h-96'>
                    <table className='w-full text-sm border-collapse'>
                      <thead className='bg-violet-50 sticky top-0'>
                        <tr>
                          {columnsB.map((col, idx) => (
                            <th key={idx} className='text-left p-3 font-medium text-gray-700 border-b-2 border-violet-200 whitespace-nowrap'>
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {uniqueToB.map((row, idx) => (
                          <tr key={idx} className='border-b border-gray-200 hover:bg-violet-50'>
                            {columnsB.map((col, colIdx) => (
                              <td key={colIdx} className='p-3 text-gray-800 whitespace-nowrap'>
                                {row[col] !== undefined && row[col] !== null ? String(row[col]) : ''}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  )
                : (
                  <p className='text-gray-500 italic'>No unique rows found. All values in File B exist in File A.</p>
                  )}
            </div>
          </div>
        )}

        {dataA.length === 0 && dataB.length === 0 && (
          <div className='bg-white rounded-lg shadow-md p-12 text-center'>
            <FileText className='mx-auto text-gray-400 mb-4' size={48} />
            <p className='text-gray-500 text-sm'>
              Upload both CSV files to start comparing
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

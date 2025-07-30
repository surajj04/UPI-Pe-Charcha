import React, { useRef, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  ReferenceLine
} from 'recharts'
import {
  FiDownload,
  FiTrendingUp,
  FiTrendingDown,
  FiPieChart,
  FiCalendar,
  FiCreditCard,
  FiDollarSign,
  FiAlertCircle,
  FiPrinter
} from 'react-icons/fi'
import { FaIndianRupeeSign } from 'react-icons/fa6'
import { CgExport } from 'react-icons/cg'
import { BsGraphUp, BsGraphDown } from 'react-icons/bs'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

const Report = ({ data: reportData }) => {
  const reportRef = useRef(null)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  const [isExportingCSV, setIsExportingCSV] = useState(false)

  // Use the actual data from backend
  const initialTransactions = reportData?.data || []
  const filename = reportData?.filename || 'Unknown File'

  // Process data for visualizations
  const processData = () => {
    const monthlyTrends = {}
    const categorySpending = {}
    const categoryIncome = {}
    const dailyBalance = []
    let totalCredit = 0
    let totalDebit = 0
    let highestSpending = { amount: 0, category: '' }
    let highestIncome = { amount: 0, mapped_description: '' }
    let averageDailySpending = 0
    let spendingDays = 0

    // Calculate running balance
    let runningBalance = 0
    const processedTransactions = initialTransactions.map(transaction => {
      if (transaction.type === 'credit') {
        runningBalance += transaction.amount
      } else {
        runningBalance -= transaction.amount
      }
      return { ...transaction, balance: runningBalance }
    })

    processedTransactions.forEach(transaction => {
      const date = new Date(transaction.date)
      const month = date.toLocaleString('default', { month: 'short' })
      const year = date.getFullYear()
      const monthYear = `${month} ${year}`

      // Track daily balance
      dailyBalance.push({
        date: transaction.date,
        balance: transaction.balance,
        type: transaction.type
      })

      // Monthly trends
      if (!monthlyTrends[monthYear]) {
        monthlyTrends[monthYear] = {
          credit: 0,
          debit: 0,
          name: monthYear
        }
      }

      if (transaction.type === 'credit') {
        monthlyTrends[monthYear].credit += transaction.amount
        totalCredit += transaction.amount

        // Track highest income
        if (transaction.amount > highestIncome.amount) {
          highestIncome = {
            amount: transaction.amount,
            description: transaction.description,
            date: transaction.date,
            mapped_description: transaction.mapped_description
          }
        }
      } else {
        monthlyTrends[monthYear].debit += transaction.amount
        totalDebit += transaction.amount
        spendingDays++
        averageDailySpending += transaction.amount

        // Track highest spending
        if (transaction.amount > highestSpending.amount) {
          highestSpending = {
            amount: transaction.amount,
            description: transaction.description,
            date: transaction.date,
            category: transaction.category
          }
        }
      }

      // Category breakdown
      if (transaction.type === 'debit') {
        categorySpending[transaction.category] =
          (categorySpending[transaction.category] || 0) + transaction.amount
      } else {
        categoryIncome[transaction.mapped_description] =
          (categoryIncome[transaction.mapped_description] || 0) +
          transaction.amount
      }
    })

    averageDailySpending =
      spendingDays > 0 ? averageDailySpending / spendingDays : 0
    const netSavings = totalCredit - totalDebit
    const savingsRate = totalCredit > 0 ? (netSavings / totalCredit) * 100 : 0

    const openingBalance =
      processedTransactions[0]?.balance - processedTransactions[0]?.amount || 0
    const closingBalance =
      processedTransactions[processedTransactions.length - 1]?.balance || 0

    return {
      monthlyData: Object.values(monthlyTrends),
      spendingData: Object.entries(categorySpending).map(([name, value]) => ({
        name,
        value
      })),
      incomeData: Object.entries(categoryIncome).map(([name, value]) => ({
        name,
        value
      })),
      dailyBalanceData: dailyBalance,
      processedTransactions,
      summary: {
        openingBalance,
        closingBalance,
        totalCredit,
        totalDebit,
        netChange: closingBalance - openingBalance,
        highestSpending,
        highestIncome,
        averageDailySpending,
        savingsRate,
        netSavings
      }
    }
  }

  const {
    monthlyData,
    spendingData,
    incomeData,
    dailyBalanceData,
    processedTransactions,
    summary
  } = processData()

  const COLORS = [
    '#3B82F6', // blue-500
    '#10B981', // emerald-500
    '#F59E0B', // amber-500
    '#EF4444', // red-500
    '#8B5CF6', // violet-500
    '#EC4899' // pink-500
  ]

  const formatCurrency = amount => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = dateString => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  // Get the date range for the report
  const getDateRange = () => {
    if (initialTransactions.length === 0) return ''
    const firstDate = new Date(initialTransactions[0].date)
    const lastDate = new Date(
      initialTransactions[initialTransactions.length - 1].date
    )
    return `${firstDate.toLocaleDateString()} - ${lastDate.toLocaleDateString()}`
  }

  // Generate PDF function with oklch color fix
  const generatePDF = async () => {
    setIsGeneratingPDF(true)
    try {
      const element = reportRef.current

      // Create a deep clone of the element
      const clone = element.cloneNode(true)

      // Remove all style attributes that might contain oklch
      const styledElements = clone.querySelectorAll('[style]')
      styledElements.forEach(el => {
        const style = el.getAttribute('style')
        if (style && style.includes('oklch')) {
          el.removeAttribute('style')
        }
      })

      // Create a temporary container
      const tempContainer = document.createElement('div')
      tempContainer.appendChild(clone)
      tempContainer.style.position = 'absolute'
      tempContainer.style.left = '-9999px'
      document.body.appendChild(tempContainer)

      const canvas = await html2canvas(clone, {
        scale: 2,
        logging: true,
        useCORS: true,
        backgroundColor: '#FFFFFF',
        onclone: clonedDoc => {
          // Additional safety - remove any remaining oklch references
          clonedDoc.querySelectorAll('*').forEach(el => {
            if (
              el.style &&
              el.style.cssText &&
              el.style.cssText.includes('oklch')
            ) {
              el.style.cssText = el.style.cssText.replace(
                /oklch\([^)]+\)/g,
                '#FFFFFF'
              )
            }
          })
        }
      })

      document.body.removeChild(tempContainer)

      const imgData = canvas.toDataURL('image/png', 1.0)
      const pdf = new jsPDF('p', 'mm', 'a4')
      const imgProps = pdf.getImageProperties(imgData)
      const pdfWidth = pdf.internal.pageSize.getWidth() - 20
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width

      pdf.addImage(imgData, 'PNG', 10, 10, pdfWidth, pdfHeight)

      // Add footer with timestamp
      const dateStr = new Date().toLocaleString()
      pdf.setFontSize(10)
      pdf.setTextColor(150)
      pdf.text(
        `Generated on ${dateStr}`,
        105,
        pdf.internal.pageSize.getHeight() - 10,
        {
          align: 'center'
        }
      )

      pdf.save(`financial-report-${new Date().toISOString().slice(0, 10)}.pdf`)
    } catch (error) {
      console.error('PDF generation failed:', error)
      alert(
        'PDF generation failed. Please try the Print or CSV export options instead.'
      )
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  // Export CSV function
  const exportCSV = () => {
    setIsExportingCSV(true)
    try {
      let csvContent = 'Date,Description,Category,Amount,Type,Balance\n'

      processedTransactions.forEach(transaction => {
        csvContent +=
          `"${formatDate(transaction.date)}",` +
          `"${transaction.description.replace(/"/g, '""')}",` +
          `"${
            transaction.type === 'credit'
              ? transaction.mapped_description
              : transaction.category
          }",` +
          `${transaction.amount},` +
          `${transaction.type},` +
          `${transaction.balance}\n`
      })

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute(
        'download',
        `transactions-${new Date().toISOString().slice(0, 10)}.csv`
      )
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Error exporting CSV:', error)
      alert('Failed to export CSV. Please try again.')
    } finally {
      setIsExportingCSV(false)
    }
  }

  // Print function
  const printReport = () => {
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <html>
        <head>
          <title>Financial Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
            .print-header { text-align: center; margin-bottom: 20px; }
            .print-header h1 { margin: 0; font-size: 24px; }
            .print-header p { margin: 5px 0 0; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { padding: 8px; border: 1px solid #ddd; text-align: left; }
            th { background-color: #f2f2f2; }
            .positive { color: green; }
            .negative { color: red; }
            .chart-container { page-break-inside: avoid; margin-bottom: 20px; }
            @page { size: auto; margin: 10mm; }
            @media print {
              .no-print { display: none; }
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="print-header">
            <h1>Transaction Analysis Report</h1>
            <p>Source: ${filename} | Period: ${getDateRange()}</p>
            <p>Generated on ${new Date().toLocaleString()}</p>
          </div>
          <div>
            <h2>Key Metrics</h2>
            <p><strong>Net Savings:</strong> ${formatCurrency(
              summary.netSavings
            )}</p>
            <p><strong>Savings Rate:</strong> ${summary.savingsRate.toFixed(
              1
            )}%</p>
            <p><strong>Total Income:</strong> ${formatCurrency(
              summary.totalCredit
            )}</p>
            <p><strong>Total Expenses:</strong> ${formatCurrency(
              summary.totalDebit
            )}</p>
          </div>
          <h2>Transaction History</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              ${processedTransactions
                .map(
                  transaction => `
                <tr>
                  <td>${formatDate(transaction.date)}</td>
                  <td>${transaction.description}</td>
                  <td>${
                    transaction.type === 'credit'
                      ? transaction.mapped_description
                      : transaction.category
                  }</td>
                  <td class="${
                    transaction.type === 'credit' ? 'positive' : 'negative'
                  }">
                    ${transaction.type === 'credit' ? '+' : '-'}
                    ${formatCurrency(Math.abs(transaction.amount))}
                  </td>
                  <td>${formatCurrency(transaction.balance)}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 200);
            };
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <div
      className='container mx-auto p-4 space-y-8'
      ref={reportRef}
      id='report-container'
    >
      {/* Dashboard Header */}
      <div className='flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl shadow-sm'>
        <div>
          <h1 className='text-3xl font-bold text-gray-800'>
            Transaction Analysis Report
          </h1>
          <p className='text-gray-600 mt-1'>
            <span className='font-medium'>Source:</span> {filename} |
            <span className='font-medium ml-2'>Period:</span> {getDateRange()}
          </p>
        </div>
        <div className='flex space-x-3 mt-4 md:mt-0'>
          <button
            onClick={generatePDF}
            disabled={isGeneratingPDF}
            className={`flex items-center px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
              isGeneratingPDF
                ? 'border-gray-300 text-gray-500 bg-gray-100 cursor-not-allowed'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <FiDownload className='mr-2' />
            {isGeneratingPDF ? 'Generating PDF...' : 'Download PDF'}
          </button>
          <button
            onClick={exportCSV}
            disabled={isExportingCSV}
            className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${
              isExportingCSV
                ? 'bg-blue-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            <CgExport className='mr-2' />
            {isExportingCSV ? 'Exporting...' : 'Export CSV'}
          </button>
          <button
            onClick={printReport}
            className='flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors'
          >
            <FiPrinter className='mr-2' />
            Print
          </button>
        </div>
      </div>

      {/* Key Insights Section */}
      <div className='bg-white p-6 rounded-xl shadow-sm'>
        <h2 className='text-xl font-semibold text-gray-800 mb-4'>
          Key Insights
        </h2>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
          <div className='bg-blue-50 p-4 rounded-lg'>
            <div className='flex items-center'>
              <div className='p-2 rounded-full bg-blue-100 text-blue-600'>
                <FiTrendingUp size={18} />
              </div>
              <div className='ml-3'>
                <p className='text-sm text-gray-600'>Net Savings</p>
                <p className='text-lg font-bold text-blue-700'>
                  {formatCurrency(summary.netSavings)}
                </p>
              </div>
            </div>
          </div>
          <div className='bg-green-50 p-4 rounded-lg'>
            <div className='flex items-center'>
              <div className='p-2 rounded-full bg-green-100 text-green-600'>
                <BsGraphUp size={18} />
              </div>
              <div className='ml-3'>
                <p className='text-sm text-gray-600'>Savings Rate</p>
                <p className='text-lg font-bold text-green-700'>
                  {summary.savingsRate.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
          <div className='bg-yellow-50 p-4 rounded-lg'>
            <div className='flex items-center'>
              <div className='p-2 rounded-full bg-yellow-100 text-yellow-600'>
                <FiCreditCard size={18} />
              </div>
              <div className='ml-3'>
                <p className='text-sm text-gray-600'>Avg Daily Spend</p>
                <p className='text-lg font-bold text-yellow-700'>
                  {formatCurrency(summary.averageDailySpending)}
                </p>
              </div>
            </div>
          </div>
          <div className='bg-purple-50 p-4 rounded-lg'>
            <div className='flex items-center'>
              <div className='p-2 rounded-full bg-purple-100 text-purple-600'>
                <FiCalendar size={18} />
              </div>
              <div className='ml-3'>
                <p className='text-sm text-gray-600'>Transactions</p>
                <p className='text-lg font-bold text-purple-700'>
                  {processedTransactions.length} (
                  {processedTransactions.filter(t => t.type === 'debit').length}{' '}
                  expenses)
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        <div className='bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow'>
          <div className='flex items-center'>
            <div className='p-3 rounded-full bg-blue-50 text-blue-600'>
              <FaIndianRupeeSign size={20} />
            </div>
            <div className='ml-4'>
              <p className='text-sm text-gray-500 font-medium'>
                Opening Balance
              </p>
              <p className='text-2xl font-bold text-gray-800'>
                {formatCurrency(summary.openingBalance)}
              </p>
            </div>
          </div>
        </div>

        <div className='bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow'>
          <div className='flex items-center'>
            <div className='p-3 rounded-full bg-green-50 text-green-600'>
              <FiTrendingUp size={20} />
            </div>
            <div className='ml-4'>
              <p className='text-sm text-gray-500 font-medium'>Total Income</p>
              <p className='text-2xl font-bold text-green-600'>
                {formatCurrency(summary.totalCredit)}
              </p>
            </div>
          </div>
        </div>

        <div className='bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow'>
          <div className='flex items-center'>
            <div className='p-3 rounded-full bg-red-50 text-red-600'>
              <FiTrendingDown size={20} />
            </div>
            <div className='ml-4'>
              <p className='text-sm text-gray-500 font-medium'>
                Total Expenses
              </p>
              <p className='text-2xl font-bold text-red-600'>
                {formatCurrency(summary.totalDebit)}
              </p>
            </div>
          </div>
        </div>

        <div className='bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow'>
          <div className='flex items-center'>
            <div className='p-3 rounded-full bg-purple-50 text-purple-600'>
              <FaIndianRupeeSign size={20} />
            </div>
            <div className='ml-4'>
              <p className='text-sm text-gray-500 font-medium'>
                Closing Balance
              </p>
              <p className='text-2xl font-bold text-gray-800'>
                {formatCurrency(summary.closingBalance)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        {/* Monthly Trends */}
        <div className='bg-white p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow'>
          <div className='flex items-center justify-between mb-5'>
            <h2 className='text-xl font-semibold text-gray-800'>
              Monthly Cash Flow
            </h2>
            <div className='flex space-x-2'>
              <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800'>
                Income
              </span>
              <span className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800'>
                Expenses
              </span>
            </div>
          </div>
          <div className='h-80'>
            <ResponsiveContainer width='100%' height='100%'>
              <BarChart data={monthlyData}>
                <CartesianGrid
                  strokeDasharray='3 3'
                  vertical={false}
                  stroke='#E5E7EB'
                />
                <XAxis
                  dataKey='name'
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280' }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280' }}
                  tickFormatter={value => `₹${value}`}
                />
                <Tooltip
                  contentStyle={{
                    background: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '0.5rem',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  formatter={value => [formatCurrency(value), 'Amount']}
                />
                <Bar
                  dataKey='credit'
                  name='Income'
                  fill='#10B981'
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey='debit'
                  name='Expenses'
                  fill='#EF4444'
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Spending by Category */}
        <div className='bg-white p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow'>
          <div className='flex items-center justify-between mb-5'>
            <h2 className='text-xl font-semibold text-gray-800'>
              Expense Breakdown
            </h2>
            <div className='p-2 rounded-full bg-blue-50 text-blue-600'>
              <FiPieChart size={18} />
            </div>
          </div>
          <div className='h-80'>
            <ResponsiveContainer width='100%' height='100%'>
              <PieChart>
                <Pie
                  data={spendingData}
                  cx='50%'
                  cy='50%'
                  labelLine={false}
                  outerRadius={80}
                  innerRadius={40}
                  fill='#8884d8'
                  dataKey='value'
                  nameKey='name'
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {spendingData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={value => [formatCurrency(value), 'Amount']}
                  contentStyle={{
                    background: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '0.5rem',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend
                  layout='horizontal'
                  verticalAlign='bottom'
                  align='center'
                  wrapperStyle={{ paddingTop: '20px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        {/* Income Sources */}
        <div className='bg-white p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow'>
          <h2 className='text-xl font-semibold text-gray-800 mb-5'>
            Income Sources
          </h2>
          <div className='h-80'>
            <ResponsiveContainer width='100%' height='100%'>
              <BarChart data={incomeData}>
                <CartesianGrid
                  strokeDasharray='3 3'
                  vertical={false}
                  stroke='#E5E7EB'
                />
                <XAxis
                  dataKey='name'
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280' }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280' }}
                  tickFormatter={value => `₹${value}`}
                />
                <Tooltip
                  formatter={value => [formatCurrency(value), 'Amount']}
                  contentStyle={{
                    background: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '0.5rem',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Bar
                  dataKey='value'
                  name='Amount'
                  fill='#10B981'
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Balance Trend */}
        <div className='bg-white p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow'>
          <h2 className='text-xl font-semibold text-gray-800 mb-5'>
            Account Balance Trend
          </h2>
          <div className='h-80'>
            <ResponsiveContainer width='100%' height='100%'>
              <AreaChart data={dailyBalanceData}>
                <CartesianGrid
                  strokeDasharray='3 3'
                  vertical={false}
                  stroke='#E5E7EB'
                />
                <XAxis
                  dataKey='date'
                  tickFormatter={value => new Date(value).getDate()}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280' }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280' }}
                  tickFormatter={value => `₹${value}`}
                />
                <Tooltip
                  labelFormatter={value => formatDate(value)}
                  formatter={value => [formatCurrency(value), 'Balance']}
                  contentStyle={{
                    background: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '0.5rem',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Area
                  type='monotone'
                  dataKey='balance'
                  stroke='#3B82F6'
                  fill='#EFF6FF'
                  strokeWidth={2}
                />
                <ReferenceLine
                  y={summary.openingBalance}
                  label='Opening'
                  stroke='#6B7280'
                  strokeDasharray='3 3'
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Highlights Section */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        {/* Highest Spending */}
        <div className='bg-white p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow'>
          <h2 className='text-xl font-semibold text-gray-800 mb-5'>
            <FiAlertCircle className='inline mr-2 text-red-500' />
            Highest Expense
          </h2>
          <div className='flex items-center justify-between p-4 bg-red-50 rounded-lg'>
            <div>
              <p className='text-lg font-medium text-red-800'>
                {summary.highestSpending.description}
              </p>
              <p className='text-sm text-gray-600'>
                {formatDate(summary.highestSpending.date)}
              </p>
              <p className='text-xs text-gray-500 mt-1'>
                Category: {summary.highestSpending.category}
              </p>
            </div>
            <div className='text-right'>
              <p className='text-2xl font-bold text-red-600'>
                {formatCurrency(summary.highestSpending.amount)}
              </p>
              <p className='text-xs text-gray-500'>Single largest expense</p>
            </div>
          </div>
        </div>

        {/* Highest Income */}
        <div className='bg-white p-5 rounded-xl shadow-sm hover:shadow-md transition-shadow'>
          <h2 className='text-xl font-semibold text-gray-800 mb-5'>
            <FiAlertCircle className='inline mr-2 text-green-500' />
            Highest Income
          </h2>
          <div className='flex items-center justify-between p-4 bg-green-50 rounded-lg'>
            <div>
              <p className='text-lg font-medium text-green-800'>
                {summary.highestIncome.description}
              </p>
              <p className='text-sm text-gray-600'>
                {formatDate(summary.highestIncome.date)}
              </p>
              <p className='text-xs text-gray-500 mt-1'>
                Source: {summary.highestIncome.mapped_description}
              </p>
            </div>
            <div className='text-right'>
              <p className='text-2xl font-bold text-green-600'>
                {formatCurrency(summary.highestIncome.amount)}
              </p>
              <p className='text-xs text-gray-500'>Single largest income</p>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Table */}
      <div className='bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow'>
        <div className='p-5 border-b border-gray-100'>
          <h2 className='text-xl font-semibold text-gray-800'>
            Transaction History
          </h2>
        </div>
        <div className='overflow-x-auto'>
          <table className='min-w-full divide-y divide-gray-200'>
            <thead className='bg-gray-50'>
              <tr>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Date
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Description
                </th>
                <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Category
                </th>
                <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Amount
                </th>
                <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>
                  Balance
                </th>
              </tr>
            </thead>
            <tbody className='bg-white divide-y divide-gray-200'>
              {processedTransactions.map((transaction, index) => (
                <tr key={index} className='hover:bg-gray-50 transition-colors'>
                  <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                    {formatDate(transaction.date)}
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900'>
                    {transaction.description}
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap'>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        transaction.type === 'credit'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {transaction.type === 'credit'
                        ? transaction.mapped_description
                        : transaction.category}
                    </span>
                  </td>
                  <td
                    className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                      transaction.type === 'credit'
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {transaction.type === 'credit' ? '+' : '-'}
                    {formatCurrency(Math.abs(transaction.amount))}
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500 font-medium'>
                    {formatCurrency(transaction.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className='bg-gray-50 px-6 py-3 border-t border-gray-200'>
          <p className='text-xs text-gray-500'>
            Showing {processedTransactions.length} transactions
          </p>
        </div>
      </div>

      {/* Summary Section */}
      <div className='bg-white p-6 rounded-xl shadow-sm'>
        <h2 className='text-xl font-semibold text-gray-800 mb-4'>
          Financial Summary
        </h2>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          <div>
            <h3 className='text-lg font-medium text-gray-700 mb-3'>
              Income vs Expenses
            </h3>
            <div className='space-y-2'>
              <div className='flex justify-between'>
                <span className='text-gray-600'>Total Income:</span>
                <span className='font-medium text-green-600'>
                  {formatCurrency(summary.totalCredit)}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-gray-600'>Total Expenses:</span>
                <span className='font-medium text-red-600'>
                  {formatCurrency(summary.totalDebit)}
                </span>
              </div>
              <div className='border-t border-gray-200 my-2'></div>
              <div className='flex justify-between'>
                <span className='text-gray-600'>Net Savings:</span>
                <span
                  className={`font-medium ${
                    summary.netSavings >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {formatCurrency(summary.netSavings)}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-gray-600'>Savings Rate:</span>
                <span
                  className={`font-medium ${
                    summary.savingsRate >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {summary.savingsRate.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
          <div>
            <h3 className='text-lg font-medium text-gray-700 mb-3'>
              Balance Changes
            </h3>
            <div className='space-y-2'>
              <div className='flex justify-between'>
                <span className='text-gray-600'>Opening Balance:</span>
                <span className='font-medium text-gray-800'>
                  {formatCurrency(summary.openingBalance)}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-gray-600'>Closing Balance:</span>
                <span className='font-medium text-gray-800'>
                  {formatCurrency(summary.closingBalance)}
                </span>
              </div>
              <div className='border-t border-gray-200 my-2'></div>
              <div className='flex justify-between'>
                <span className='text-gray-600'>Net Change:</span>
                <span
                  className={`font-medium ${
                    summary.netChange >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {formatCurrency(summary.netChange)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Report

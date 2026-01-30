/**
 * Utility function to export data to CSV with proper encoding and error handling
 * @param {Array} data - Array of objects to export
 * @param {Array} headers - Array of header strings
 * @param {Function} rowMapper - Function to map each data item to an array of values
 * @param {string} filename - Name of the file (without extension)
 * @returns {boolean} - Success status
 */
export const exportToCSV = (data, headers, rowMapper, filename) => {
  try {
    if (!data || data.length === 0) {
      throw new Error('Aucune donnée à exporter');
    }

    // Create CSV content
    const csv = [
      headers.join(','),
      ...data.map(item => {
        const values = rowMapper(item);
        return values.map(val => `"${String(val || '')}"`).join(',');
      })
    ].join('\n');
    
    // Add BOM for UTF-8 compatibility (Excel, etc.)
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    
    // Create download link
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    
    // Required for Firefox compatibility
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Clean up
    window.URL.revokeObjectURL(url);
    
    return true;
  } catch (error) {
    console.error('Export error:', error);
    return false;
  }
};

export default exportToCSV;

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const reportService = require('../services/reportService');

// GET /api/v1/reports/:type (JSON data)
router.get('/:type', authenticateToken, (req, res) => {
  try {
    const reportType = req.params.type;
    const filters = req.query;

    const data = reportService.getReportData(reportType, filters);
    res.json({
      success: true,
      reportType,
      generatedAt: new Date().toISOString(),
      institution: 'Moshi Co-operative University (MoCU)',
      totalRecords: data.length,
      data
    });
  } catch (err) {
    console.error('Report error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// GET /api/v1/reports/:type/export (Export Excel or CSV)
router.get('/:type/export', authenticateToken, async (req, res) => {
  try {
    const reportType = req.params.type;
    const format = (req.query.format || 'xlsx').toLowerCase();
    const filters = req.query;

    const data = reportService.getReportData(reportType, filters);
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `MoCU_${reportType.toUpperCase()}_${dateStr}`;

    if (format === 'csv') {
      const csv = reportService.generateCsv(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      return res.send(csv);
    } else {
      // Excel XLSX
      const workbook = await reportService.generateExcelWorkbook(reportType, data);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
      await workbook.xlsx.write(res);
      res.end();
    }
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

const prisma = require('../../api/db');

// GET /divisions
async function getDivisions(req, res, next) {
  try {
    const list = await prisma.m_division.findMany({ orderBy: { name: 'asc' } });
    res.json(list);
  } catch (err) {
    next(err);
  }
}

// GET /document-types
async function getDocumentTypes(req, res, next) {
  try {
    const list = await prisma.m_document_type.findMany({ orderBy: { name: 'asc' } });
    res.json(list);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDivisions,
  getDocumentTypes
};

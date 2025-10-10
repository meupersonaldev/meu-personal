import { Router } from 'express'
import { requireAuth } from '../../middleware/auth'
import {
  getStudentUnits,
  getAvailableUnits,
  activateStudentUnit,
  getStudentActiveUnit,
  joinUnit
} from './student-units'

const router = Router()

// All routes require authentication
router.use(requireAuth)

// GET /api/student-units - Get student's units with active status
router.get('/', getStudentUnits)

// GET /api/student-units/available - Get available units for student to join
router.get('/available', getAvailableUnits)

// GET /api/student-units/active - Get student's active unit
router.get('/active', getStudentActiveUnit)

// POST /api/student-units/join - Join a new unit
router.post('/join', joinUnit)

// POST /api/student-units/:unitId/activate - Activate a unit for student
router.post('/:unitId/activate', activateStudentUnit)

export default router
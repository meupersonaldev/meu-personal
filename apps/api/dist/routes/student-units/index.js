"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const student_units_1 = require("./student-units");
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth);
router.get('/', student_units_1.getStudentUnits);
router.get('/available', student_units_1.getAvailableUnits);
router.get('/active', student_units_1.getStudentActiveUnit);
router.post('/join', student_units_1.joinUnit);
router.post('/:unitId/activate', student_units_1.activateStudentUnit);
exports.default = router;
//# sourceMappingURL=index.js.map
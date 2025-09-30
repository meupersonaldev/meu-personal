"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const compression_1 = __importDefault(require("compression"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use((0, compression_1.default)());
app.use((0, morgan_1.default)('dev'));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
const auth_1 = __importDefault(require("./routes/auth"));
const teachers_1 = __importDefault(require("./routes/teachers"));
const students_1 = __importDefault(require("./routes/students"));
const bookings_1 = __importDefault(require("./routes/bookings"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const plans_1 = __importDefault(require("./routes/plans"));
const approvals_1 = __importDefault(require("./routes/approvals"));
const payments_1 = __importDefault(require("./routes/payments"));
const franchises_1 = __importDefault(require("./routes/franchises"));
const webhooks_1 = __importDefault(require("./routes/webhooks"));
const checkout_1 = __importDefault(require("./routes/checkout"));
app.use('/api/auth', auth_1.default);
app.use('/api/teachers', teachers_1.default);
app.use('/api/students', students_1.default);
app.use('/api/bookings', bookings_1.default);
app.use('/api/notifications', notifications_1.default);
app.use('/api/plans', plans_1.default);
app.use('/api/approvals', approvals_1.default);
app.use('/api/payments', payments_1.default);
app.use('/api/franchises', franchises_1.default);
app.use('/api/webhooks', webhooks_1.default);
app.use('/api/checkout', checkout_1.default);
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        message: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
//# sourceMappingURL=server.js.map
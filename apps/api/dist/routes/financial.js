"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supabase_1 = require("../lib/supabase");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/summary', auth_1.requireAuth, (0, auth_1.requireRole)(['FRANQUEADORA', 'SUPER_ADMIN', 'FRANQUIA']), async (req, res) => {
    try {
        const { academy_id, period = '30d' } = req.query;
        if (!academy_id) {
            return res.status(400).json({ error: 'academy_id é obrigatório' });
        }
        const now = new Date();
        let startDate = new Date();
        switch (period) {
            case '7d':
                startDate.setDate(now.getDate() - 7);
                break;
            case '30d':
                startDate.setDate(now.getDate() - 30);
                break;
            case '90d':
                startDate.setDate(now.getDate() - 90);
                break;
            case 'all':
                startDate = new Date('2020-01-01');
                break;
            default:
                startDate.setDate(now.getDate() - 30);
        }
        const { data: academyStudents, error: studentsError } = await supabase_1.supabase
            .from('academy_students')
            .select(`
        id,
        status,
        student_id,
        plan_id,
        join_date,
        users:student_id (
          id,
          name,
          email
        ),
        academy_plans:plan_id (
          id,
          name,
          price
        )
      `)
            .eq('academy_id', academy_id)
            .gte('join_date', startDate.toISOString());
        if (studentsError) {
            console.error('Error fetching students:', studentsError);
            throw studentsError;
        }
        const students = academyStudents || [];
        const { data: bookings, error: bookingsError } = await supabase_1.supabase
            .from('bookings')
            .select(`
        id,
        date,
        credits_cost,
        status,
        student_id,
        teacher_id,
        users!bookings_student_id_fkey (name),
        teachers:users!bookings_teacher_id_fkey (name)
      `)
            .eq('franchise_id', academy_id)
            .eq('status', 'COMPLETED')
            .gte('date', startDate.toISOString());
        if (bookingsError)
            throw bookingsError;
        const activeSubscriptions = students.filter((s) => s.status === 'active').length;
        const totalStudents = students.length;
        const planRevenue = students
            .filter((s) => s.status === 'active' && s.academy_plans)
            .reduce((sum, s) => {
            return sum + (s.academy_plans?.price || 0);
        }, 0);
        const classRevenue = (bookings || []).reduce((sum, b) => {
            return sum + (b.credits_cost * 50 || 0);
        }, 0);
        const totalRevenue = planRevenue + classRevenue;
        const averageTicket = activeSubscriptions > 0 ? totalRevenue / activeSubscriptions : 0;
        const revenueByPlan = new Map();
        students.forEach((student) => {
            if (student.academy_plans && student.status === 'active') {
                const plan = student.academy_plans;
                const current = revenueByPlan.get(plan.id) || {
                    name: plan.name,
                    revenue: 0,
                    count: 0
                };
                revenueByPlan.set(plan.id, {
                    name: plan.name,
                    revenue: current.revenue + plan.price,
                    count: current.count + 1
                });
            }
        });
        const revenueByPlanArray = Array.from(revenueByPlan.values())
            .sort((a, b) => b.revenue - a.revenue);
        const previousPeriodStart = new Date(startDate);
        const periodDays = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        previousPeriodStart.setDate(previousPeriodStart.getDate() - periodDays);
        const { data: previousBookings } = await supabase_1.supabase
            .from('bookings')
            .select('credits_cost')
            .eq('franchise_id', academy_id)
            .eq('status', 'COMPLETED')
            .gte('date', previousPeriodStart.toISOString())
            .lt('date', startDate.toISOString());
        const previousRevenue = (previousBookings || []).reduce((sum, b) => {
            return sum + (b.credits_cost * 50 || 0);
        }, 0);
        const monthlyGrowth = previousRevenue > 0
            ? ((totalRevenue - previousRevenue) / previousRevenue) * 100
            : 0;
        const transactions = (bookings || []).map((booking) => ({
            id: booking.id,
            studentName: booking.users?.name || 'Aluno não encontrado',
            teacherName: booking.teachers?.name || 'Professor não encontrado',
            planName: 'Aula Avulsa',
            amount: booking.credits_cost * 50,
            date: booking.date,
            status: 'completed',
            type: 'class'
        }));
        students.forEach((student) => {
            if (student.academy_plans) {
                transactions.push({
                    id: `plan-${student.id}`,
                    studentName: student.users?.name || 'Aluno não encontrado',
                    teacherName: '-',
                    planName: student.academy_plans.name,
                    amount: student.academy_plans.price,
                    date: student.join_date,
                    status: student.status === 'active' ? 'completed' : 'pending',
                    type: 'plan'
                });
            }
        });
        transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        res.json({
            totalRevenue,
            activeSubscriptions,
            totalStudents,
            averageTicket,
            completedClasses: (bookings || []).length,
            monthlyGrowth,
            revenueByPlan: revenueByPlanArray,
            transactions: transactions.slice(0, 50)
        });
    }
    catch (error) {
        console.error('Error fetching financial summary:', error);
        res.status(500).json({ error: error.message });
    }
});
router.get('/revenue-chart', auth_1.requireAuth, (0, auth_1.requireRole)(['FRANQUEADORA', 'SUPER_ADMIN', 'FRANQUIA']), async (req, res) => {
    try {
        const { academy_id, period = '30d' } = req.query;
        if (!academy_id) {
            return res.status(400).json({ error: 'academy_id é obrigatório' });
        }
        const now = new Date();
        let startDate = new Date();
        let groupBy = 'day';
        switch (period) {
            case '7d':
                startDate.setDate(now.getDate() - 7);
                groupBy = 'day';
                break;
            case '30d':
                startDate.setDate(now.getDate() - 30);
                groupBy = 'day';
                break;
            case '90d':
                startDate.setDate(now.getDate() - 90);
                groupBy = 'week';
                break;
            case 'all':
                startDate = new Date('2020-01-01');
                groupBy = 'month';
                break;
            default:
                startDate.setDate(now.getDate() - 30);
        }
        const { data: bookings, error } = await supabase_1.supabase
            .from('bookings')
            .select('date, credits_cost, status')
            .eq('franchise_id', academy_id)
            .eq('status', 'COMPLETED')
            .gte('date', startDate.toISOString())
            .order('date', { ascending: true });
        if (error)
            throw error;
        const revenueByPeriod = new Map();
        (bookings || []).forEach((booking) => {
            const date = new Date(booking.date);
            let key = '';
            if (groupBy === 'day') {
                key = date.toISOString().split('T')[0];
            }
            else if (groupBy === 'week') {
                const weekStart = new Date(date);
                weekStart.setDate(date.getDate() - date.getDay());
                key = weekStart.toISOString().split('T')[0];
            }
            else {
                key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            }
            const revenue = booking.credits_cost * 50;
            revenueByPeriod.set(key, (revenueByPeriod.get(key) || 0) + revenue);
        });
        const chartData = Array.from(revenueByPeriod.entries())
            .map(([date, revenue]) => ({ date, revenue }))
            .sort((a, b) => a.date.localeCompare(b.date));
        res.json({ data: chartData, groupBy });
    }
    catch (error) {
        console.error('Error fetching revenue chart:', error);
        res.status(500).json({ error: error.message });
    }
});
router.get('/summary-franqueadora', auth_1.requireAuth, (0, auth_1.requireRole)(['FRANQUEADORA', 'SUPER_ADMIN']), async (req, res) => {
    try {
        let { franqueadora_id } = req.query;
        if (!franqueadora_id && req.franqueadoraAdmin?.franqueadora_id) {
            franqueadora_id = req.franqueadoraAdmin.franqueadora_id;
        }
        if (!franqueadora_id && req.user?.role === 'SUPER_ADMIN') {
            const { data: franqueadora } = await supabase_1.supabase
                .from('franqueadora')
                .select('id')
                .eq('is_active', true)
                .limit(1)
                .single();
            if (franqueadora) {
                franqueadora_id = franqueadora.id;
            }
        }
        if (!franqueadora_id) {
            return res.status(400).json({ error: 'franqueadora_id é obrigatório' });
        }
        const { data: academies, error: acadError } = await supabase_1.supabase
            .from('academies')
            .select('id, is_active, monthly_revenue, royalty_percentage, created_at')
            .eq('franqueadora_id', franqueadora_id);
        if (acadError)
            throw acadError;
        const list = academies || [];
        const totalFranchises = list.length;
        const activeFranchises = list.filter(a => a.is_active).length;
        const totalRevenue = list.reduce((sum, a) => {
            const revenue = Number(a.monthly_revenue) || 0;
            return sum + revenue;
        }, 0);
        const totalRoyalties = list.reduce((sum, a) => {
            const revenue = Number(a.monthly_revenue) || 0;
            const royaltyRate = Number(a.royalty_percentage) || 0;
            return sum + (revenue * royaltyRate / 100);
        }, 0);
        const averageRevenuePerFranchise = totalFranchises > 0 ? (totalRevenue / totalFranchises) : 0;
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const currentMonthFranchises = list.filter(a => {
            const createdDate = new Date(a.created_at);
            return createdDate >= currentMonthStart;
        }).length;
        const previousMonthFranchises = list.filter(a => {
            const createdDate = new Date(a.created_at);
            return createdDate >= previousMonthStart && createdDate < currentMonthStart;
        }).length;
        const monthlyGrowth = previousMonthFranchises > 0
            ? ((currentMonthFranchises - previousMonthFranchises) / previousMonthFranchises) * 100
            : (currentMonthFranchises > 0 ? 100 : 0);
        res.json({
            totalFranchises,
            activeFranchises,
            totalRevenue,
            totalRoyalties,
            averageRevenuePerFranchise,
            monthlyGrowth
        });
    }
    catch (error) {
        console.error('Error fetching summary-franqueadora:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=financial.js.map
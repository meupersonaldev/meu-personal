import express from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth';
import { asyncErrorHandler } from '../middleware/errorHandler';
import { reviewService } from '../services/review.service';

const router = express.Router();

// Schema para criação de avaliação
const createReviewSchema = z.object({
  bookingId: z.string().uuid(),
  reviewedUserId: z.string().uuid(),
  unitId: z.string().uuid(),
  rating: z.number().min(1).max(5),
  comment: z.string().optional()
});

// Schema para atualização de avaliação
const updateReviewSchema = z.object({
  rating: z.number().min(1).max(5).optional(),
  comment: z.string().optional()
});

// POST /api/reviews - Criar nova avaliação
router.post('/', requireAuth, requireRole(['STUDENT', 'ALUNO', 'TEACHER', 'PROFESSOR']), asyncErrorHandler(async (req, res) => {
  const reviewData = createReviewSchema.parse(req.body);
  const user = req.user;

  const review = await reviewService.createReview({
    bookingId: reviewData.bookingId,
    reviewerId: user.userId,
    reviewedUserId: reviewData.reviewedUserId,
    unitId: reviewData.unitId,
    rating: reviewData.rating,
    comment: reviewData.comment
  });

  res.status(201).json({
    message: 'Avaliação criada com sucesso',
    review
  });
}));

// PUT /api/reviews/:id - Atualizar avaliação existente
router.put('/:id', requireAuth, requireRole(['STUDENT', 'ALUNO', 'TEACHER', 'PROFESSOR']), asyncErrorHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = updateReviewSchema.parse(req.body);
  const user = req.user;

  const review = await reviewService.updateReview(id, user.userId, updateData);

  res.json({
    message: 'Avaliação atualizada com sucesso',
    review
  });
}));

// DELETE /api/reviews/:id - Remover avaliação
router.delete('/:id', requireAuth, requireRole(['STUDENT', 'ALUNO', 'TEACHER', 'PROFESSOR']), asyncErrorHandler(async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  await reviewService.deleteReview(id, user.userId);

  res.json({
    message: 'Avaliação removida com sucesso'
  });
}));

// GET /api/reviews/user/:userId - Buscar avaliações visíveis de um usuário
router.get('/user/:userId', asyncErrorHandler(async (req, res) => {
  const { userId } = req.params;
  const { unit_id, limit, offset } = req.query;

  const filters: any = {};
  if (unit_id) filters.unitId = unit_id as string;
  if (limit) filters.limit = parseInt(limit as string);
  if (offset) filters.offset = parseInt(offset as string);

  const reviews = await reviewService.getVisibleReviews(userId, filters);

  res.json({ reviews });
}));

// GET /api/reviews/my-reviews - Buscar avaliações que o usuário fez
router.get('/my-reviews', requireAuth, asyncErrorHandler(async (req, res) => {
  const user = req.user;
  const { unit_id, include_invisible, limit, offset } = req.query;

  const filters: any = {};
  if (unit_id) filters.unitId = unit_id as string;
  if (include_invisible === 'true') filters.includeInvisible = true;
  if (limit) filters.limit = parseInt(limit as string);
  if (offset) filters.offset = parseInt(offset as string);

  const reviews = await reviewService.getUserReviews(user.userId, filters);

  res.json({ reviews });
}));

// GET /api/reviews/stats/:userId - Estatísticas de avaliações de um usuário
router.get('/stats/:userId', asyncErrorHandler(async (req, res) => {
  const { userId } = req.params;
  const { unit_id } = req.query;

  const stats = await reviewService.getUserReviewStats(
    userId,
    unit_id as string
  );

  res.json({ stats });
}));

// GET /api/reviews/can-review/:bookingId - Verificar se pode avaliar um booking
router.get('/can-review/:bookingId', requireAuth, asyncErrorHandler(async (req, res) => {
  const { bookingId } = req.params;
  const user = req.user;

  const result = await reviewService.canReviewBooking(bookingId, user.userId);

  res.json(result);
}));

export default router;
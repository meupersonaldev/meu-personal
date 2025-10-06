import { supabase } from '../config/supabase';

export interface Review {
  id: string;
  booking_id: string;
  reviewer_id: string;
  reviewed_user_id: string;
  unit_id: string;
  rating: number; // 1-5
  comment?: string;
  is_visible: boolean;
  visible_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateReviewParams {
  bookingId: string;
  reviewerId: string;
  reviewedUserId: string;
  unitId: string;
  rating: number;
  comment?: string;
}

export interface ReviewStats {
  average_rating: number;
  total_reviews: number;
  rating_distribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

class ReviewService {
  /**
   * Cria uma nova avaliação
   * - Verifica se o booking está concluído
   * - Verifica se já existe avaliação para este booking
   * - Define visible_at baseado no tipo de reviewer
   */
  async createReview(params: CreateReviewParams): Promise<Review> {
    const { bookingId, reviewerId, reviewedUserId, unitId, rating, comment } = params;

    // Validar rating
    if (rating < 1 || rating > 5) {
      throw new Error('Avaliação deve estar entre 1 e 5 estrelas');
    }

    // Verificar se o booking está DONE
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('status_canonical, student_id, professor_id')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      throw new Error('Agendamento não encontrado');
    }

    if (booking.status_canonical !== 'DONE') {
      throw new Error('Apenas agendamentos concluídos podem ser avaliados');
    }

    // Verificar se o reviewer tem permissão (aluno avalia professor, professor avalia aluno)
    const isStudentReviewing = booking.student_id === reviewerId && booking.professor_id === reviewedUserId;
    const isProfessorReviewing = booking.professor_id === reviewerId && booking.student_id === reviewedUserId;

    if (!isStudentReviewing && !isProfessorReviewing) {
      throw new Error('Você não tem permissão para avaliar este agendamento');
    }

    // Verificar se já existe avaliação para este booking e reviewer
    const { data: existingReview, error: existingError } = await supabase
      .from('reviews')
      .select('id')
      .eq('booking_id', bookingId)
      .eq('reviewer_id', reviewerId)
      .single();

    if (existingReview || !existingError) {
      throw new Error('Você já avaliou este agendamento');
    }

    // Calcular visible_at baseado no tipo de reviewer
    const visibleAt = this.calculateVisibleAt(reviewerId, booking.student_id, booking.professor_id);

    // Criar a avaliação
    const { data: review, error: createError } = await supabase
      .from('reviews')
      .insert({
        booking_id: bookingId,
        reviewer_id: reviewerId,
        reviewed_user_id: reviewedUserId,
        unit_id: unitId,
        rating,
        comment,
        is_visible: false, // Inicia invisível até visible_at
        visible_at: visibleAt
      })
      .select()
      .single();

    if (createError || !review) {
      throw new Error(`Erro ao criar avaliação: ${createError?.message}`);
    }

    console.log(`✅ Avaliação criada: ${review.id} - ${rating} estrelas - Visível em: ${visibleAt}`);
    return review;
  }

  /**
   * Calcula quando a avaliação ficará visível
   * - Alunos avaliando professores: 24h após o booking ser DONE
   * - Professores avaliando alunos: Imediato (visível na criação)
   */
  private calculateVisibleAt(reviewerId: string, studentId: string, professorId: string): string | null {
    const now = new Date();

    // Se for professor avaliando aluno, fica visível imediatamente
    if (reviewerId === professorId) {
      return now.toISOString();
    }

    // Se for aluno avaliando professor, fica visível após 24h
    if (reviewerId === studentId) {
      const visibleAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +24h
      return visibleAt.toISOString();
    }

    // Fallback: visível imediatamente
    return now.toISOString();
  }

  /**
   * Atualiza uma avaliação existente
   */
  async updateReview(reviewId: string, reviewerId: string, updates: Partial<Pick<Review, 'rating' | 'comment'>>): Promise<Review> {
    // Validar rating se fornecido
    if (updates.rating !== undefined && (updates.rating < 1 || updates.rating > 5)) {
      throw new Error('Avaliação deve estar entre 1 e 5 estrelas');
    }

    // Buscar avaliação para verificar permissão
    const { data: existingReview, error: fetchError } = await supabase
      .from('reviews')
      .select('*')
      .eq('id', reviewId)
      .single();

    if (fetchError || !existingReview) {
      throw new Error('Avaliação não encontrada');
    }

    // Verificar se é o autor da avaliação
    if (existingReview.reviewer_id !== reviewerId) {
      throw new Error('Você só pode editar suas próprias avaliações');
    }

    // Atualizar avaliação
    const { data: updatedReview, error: updateError } = await supabase
      .from('reviews')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', reviewId)
      .select()
      .single();

    if (updateError || !updatedReview) {
      throw new Error(`Erro ao atualizar avaliação: ${updateError?.message}`);
    }

    console.log(`✅ Avaliação atualizada: ${reviewId}`);
    return updatedReview;
  }

  /**
   * Remove uma avaliação (soft delete - marca como invisível)
   */
  async deleteReview(reviewId: string, reviewerId: string): Promise<void> {
    // Buscar avaliação para verificar permissão
    const { data: existingReview, error: fetchError } = await supabase
      .from('reviews')
      .select('*')
      .eq('id', reviewId)
      .single();

    if (fetchError || !existingReview) {
      throw new Error('Avaliação não encontrada');
    }

    // Verificar se é o autor da avaliação ou admin
    if (existingReview.reviewer_id !== reviewerId) {
      throw new Error('Você só pode remover suas próprias avaliações');
    }

    // Soft delete - marca como invisível
    const { error: deleteError } = await supabase
      .from('reviews')
      .update({
        is_visible: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', reviewId);

    if (deleteError) {
      throw new Error(`Erro ao remover avaliação: ${deleteError.message}`);
    }

    console.log(`✅ Avaliação removida: ${reviewId}`);
  }

  /**
   * Busca avaliações visíveis de um usuário
   */
  async getVisibleReviews(userId: string, filters?: {
    unitId?: string;
    limit?: number;
    offset?: number;
  }): Promise<Review[]> {
    let query = supabase
      .from('reviews')
      .select(`
        *,
        reviewer:users!reviews_reviewer_id_fkey(name, avatar_url),
        reviewed_user:users!reviews_reviewed_user_id_fkey(name, avatar_url),
        booking:bookings(start_at, end_at),
        unit:units(name)
      `)
      .eq('reviewed_user_id', userId)
      .eq('is_visible', true)
      .lte('visible_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (filters?.unitId) {
      query = query.eq('unit_id', filters.unitId);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Erro ao buscar avaliações: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Busca avaliações que o usuário fez
   */
  async getUserReviews(reviewerId: string, filters?: {
    unitId?: string;
    includeInvisible?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Review[]> {
    let query = supabase
      .from('reviews')
      .select(`
        *,
        reviewed_user:users!reviews_reviewed_user_id_fkey(name, avatar_url),
        booking:bookings(start_at, end_at),
        unit:units(name)
      `)
      .eq('reviewer_id', reviewerId)
      .order('created_at', { ascending: false });

    if (filters?.unitId) {
      query = query.eq('unit_id', filters.unitId);
    }

    if (!filters?.includeInvisible) {
      query = query.eq('is_visible', true);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Erro ao buscar avaliações do usuário: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Calcula estatísticas de avaliações de um usuário
   */
  async getUserReviewStats(userId: string, unitId?: string): Promise<ReviewStats> {
    let query = supabase
      .from('reviews')
      .select('rating')
      .eq('reviewed_user_id', userId)
      .eq('is_visible', true)
      .lte('visible_at', new Date().toISOString());

    if (unitId) {
      query = query.eq('unit_id', unitId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Erro ao calcular estatísticas: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return {
        average_rating: 0,
        total_reviews: 0,
        rating_distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      };
    }

    // Calcular estatísticas
    const totalReviews = data.length;
    const sumRating = data.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = sumRating / totalReviews;

    const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    data.forEach(review => {
      ratingDistribution[review.rating as keyof typeof ratingDistribution]++;
    });

    return {
      average_rating: Math.round(averageRating * 10) / 10, // 1 casa decimal
      total_reviews: totalReviews,
      rating_distribution: ratingDistribution
    };
  }

  /**
   * Processa avaliações que devem se tornar visíveis (job agendado)
   */
  async processPendingVisibleReviews(): Promise<{ processed: number }> {
    const now = new Date().toISOString();

    // Buscar avaliações que devem se tornar visíveis
    const { data: pendingReviews, error: fetchError } = await supabase
      .from('reviews')
      .select('id, student_id, teacher_id')
      .eq('is_visible', false)
      .not('visible_at', 'is', null)
      .lte('visible_at', now);

    if (fetchError) {
      throw new Error(`Erro ao buscar avaliações pendentes: ${fetchError.message}`);
    }

    if (!pendingReviews || pendingReviews.length === 0) {
      return { processed: 0 };
    }

    // Tornar avaliações visíveis
    const { error: updateError } = await supabase
      .from('reviews')
      .update({ is_visible: true })
      .eq('is_visible', false)
      .not('visible_at', 'is', null)
      .lte('visible_at', now);

    if (updateError) {
      throw new Error(`Erro ao atualizar avaliações: ${updateError.message}`);
    }

    console.log(`✅ Processadas ${pendingReviews.length} avaliações para visibilidade`);

    // Criar notificações para os usuários avaliados
    for (const review of pendingReviews) {
      try {
        await supabase
          .from('user_notifications')
          .insert({
            user_id: review.teacher_id,
            type: 'new_review',
            title: 'Nova avaliação recebida',
            message: 'Você recebeu uma nova avaliação. Confira seu perfil!',
            meta_json: {
              review_id: review.id,
              student_id: review.student_id
            },
            is_read: false,
            created_at: new Date().toISOString()
          });
      } catch (error) {
        console.error(`❌ Erro ao criar notificação para ${review.reviewed_user_id}:`, error);
      }
    }

    return { processed: pendingReviews.length };
  }

  /**
   * Verifica se um usuário pode avaliar um booking específico
   */
  async canReviewBooking(bookingId: string, userId: string): Promise<{
    canReview: boolean;
    reason?: string;
    reviewType?: 'student_to_professor' | 'professor_to_student';
  }> {
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('status_canonical, student_id, professor_id')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return { canReview: false, reason: 'Agendamento não encontrado' };
    }

    if (booking.status_canonical !== 'DONE') {
      return { canReview: false, reason: 'Apenas agendamentos concluídos podem ser avaliados' };
    }

    // Verificar se já avaliou
    const { data: existingReview, error: reviewError } = await supabase
      .from('reviews')
      .select('id')
      .eq('booking_id', bookingId)
      .eq('reviewer_id', userId)
      .single();

    if (!reviewError && existingReview) {
      return { canReview: false, reason: 'Você já avaliou este agendamento' };
    }

    // Verificar se tem permissão
    if (booking.student_id === userId) {
      return {
        canReview: true,
        reviewType: 'student_to_professor'
      };
    }

    if (booking.professor_id === userId) {
      return {
        canReview: true,
        reviewType: 'professor_to_student'
      };
    }

    return { canReview: false, reason: 'Você não participou deste agendamento' };
  }
}

export const reviewService = new ReviewService();
import { supabase } from '../lib/supabase'
import { asaasService } from './asaas.service'

class AsaasSyncService {
  /**
   * Sincronizar walletId da conta principal (franqueadora)
   * Busca wallets via API e atualiza a tabela franqueadora
   */
  async syncMainAccountWallet() {
    try {
      console.log('[ASAAS SYNC] Iniciando sincronização do walletId da conta principal...')

      // Buscar wallets da conta principal
      const walletsResult = await asaasService.getWallets()

      if (!walletsResult.success || !walletsResult.walletId) {
        console.error('[ASAAS SYNC] Erro ao buscar wallets da conta principal:', walletsResult.error)
        return { success: false, error: walletsResult.error }
      }

      // Buscar franqueadora principal (primeira ativa)
      const { data: franqueadora, error: franqueadoraError } = await supabase
        .from('franqueadora')
        .select('id, asaas_wallet_id')
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .single()

      if (franqueadoraError || !franqueadora) {
        console.warn('[ASAAS SYNC] Nenhuma franqueadora encontrada. Criando nova...')
        
        // Criar franqueadora se não existir
        const { data: newFranqueadora, error: createError } = await supabase
          .from('franqueadora')
          .insert({
            name: 'Franqueadora Principal',
            email: 'admin@meupersonal.com',
            is_active: true
          })
          .select()
          .single()

        if (createError || !newFranqueadora) {
          console.error('[ASAAS SYNC] Erro ao criar franqueadora:', createError)
          return { success: false, error: 'Erro ao criar franqueadora' }
        }

        // Atualizar com walletId
        await supabase
          .from('franqueadora')
          .update({ asaas_wallet_id: walletsResult.walletId })
          .eq('id', newFranqueadora.id)

        console.log('[ASAAS SYNC] ✅ Franqueadora criada e walletId sincronizado:', walletsResult.walletId)
        return { success: true, walletId: walletsResult.walletId, isNew: true }
      }

      // Se já tem walletId, não precisa atualizar
      if (franqueadora.asaas_wallet_id === walletsResult.walletId) {
        console.log('[ASAAS SYNC] ✅ WalletId já está sincronizado')
        return { success: true, walletId: walletsResult.walletId, isNew: false }
      }

      // Atualizar walletId
      const { error: updateError } = await supabase
        .from('franqueadora')
        .update({ asaas_wallet_id: walletsResult.walletId })
        .eq('id', franqueadora.id)

      if (updateError) {
        console.error('[ASAAS SYNC] Erro ao atualizar walletId:', updateError)
        return { success: false, error: updateError.message }
      }

      console.log('[ASAAS SYNC] ✅ WalletId da franqueadora sincronizado:', walletsResult.walletId)
      return { success: true, walletId: walletsResult.walletId, isNew: false }
    } catch (error: any) {
      console.error('[ASAAS SYNC] Erro ao sincronizar conta principal:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Sincronizar subcontas de academias sem walletId
   */
  async syncFranchiseAccounts() {
    try {
      console.log('[ASAAS SYNC] Iniciando sincronização de subcontas de franquias...')

      // Buscar academias sem walletId
      const { data: academies, error } = await supabase
        .from('academies')
        .select('id, name, email, phone, address, city, state, zip_code, franqueadora_id, cpf_cnpj, address_number, province, company_type, monthly_revenue')
        .is('asaas_wallet_id', null)
        .eq('is_active', true)

      if (error) {
        console.error('[ASAAS SYNC] Erro ao buscar academias:', error)
        return { success: false, error: error.message }
      }

      if (!academies || academies.length === 0) {
        console.log('[ASAAS SYNC] ✅ Todas as academias já têm walletId')
        return { success: true, synced: 0, total: 0 }
      }

      console.log(`[ASAAS SYNC] Encontradas ${academies.length} academias sem walletId`)

      let successCount = 0
      let errorCount = 0

      // Processar em lote (com delay para não sobrecarregar API)
      for (const academy of academies) {
        try {
          // A função getOrCreateFranchiseAccount buscará todos os campos obrigatórios do banco
          // Passar apenas o mínimo necessário, a função buscará o resto
          const result = await asaasService.getOrCreateFranchiseAccount(academy.id, {
            name: academy.name,
            email: academy.email,
            // Não passar outros campos - a função buscará do banco onde estão garantidos
            phone: academy.phone || undefined,
            address: academy.address || undefined
          })

          if (result.success) {
            successCount++
            console.log(`[ASAAS SYNC] ✅ Academia ${academy.name} sincronizada (${successCount}/${academies.length})`)
          } else {
            errorCount++
            console.error(`[ASAAS SYNC] ❌ Erro ao sincronizar academia ${academy.name}:`, result.error)
          }

          // Delay para não sobrecarregar API
          await new Promise(resolve => setTimeout(resolve, 500))
        } catch (error: any) {
          errorCount++
          console.error(`[ASAAS SYNC] ❌ Erro ao processar academia ${academy.name}:`, error.message)
        }
      }

      console.log(`[ASAAS SYNC] ✅ Sincronização concluída: ${successCount} sucesso, ${errorCount} erros`)
      return { 
        success: true, 
        synced: successCount, 
        errors: errorCount,
        total: academies.length 
      }
    } catch (error: any) {
      console.error('[ASAAS SYNC] Erro ao sincronizar franquias:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Sincronizar todas as subcontas na inicialização
   */
  async syncAll() {
    try {
      console.log('[ASAAS SYNC] ========================================')
      console.log('[ASAAS SYNC] Iniciando sincronização completa de subcontas Asaas')
      console.log('[ASAAS SYNC] ========================================')

      // 1. Sincronizar walletId da conta principal
      const mainAccountResult = await this.syncMainAccountWallet()
      if (!mainAccountResult.success) {
        console.error('[ASAAS SYNC] ⚠️ Falha ao sincronizar conta principal, mas continuando...')
      }

      // 2. Sincronizar subcontas de franquias
      const franchisesResult = await this.syncFranchiseAccounts()
      if (!franchisesResult.success) {
        console.error('[ASAAS SYNC] ⚠️ Falha ao sincronizar franquias, mas continuando...')
      }

      console.log('[ASAAS SYNC] ========================================')
      console.log('[ASAAS SYNC] Sincronização completa finalizada')
      console.log('[ASAAS SYNC] ========================================')

      return {
        success: true,
        mainAccount: mainAccountResult,
        franchises: franchisesResult
      }
    } catch (error: any) {
      console.error('[ASAAS SYNC] Erro na sincronização completa:', error)
      return { success: false, error: error.message }
    }
  }
}

export const asaasSyncService = new AsaasSyncService()


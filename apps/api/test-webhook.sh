#!/bin/bash

# Script de teste do webhook ASAAS
# Execute: bash apps/api/test-webhook.sh

echo "🧪 Testando Webhook ASAAS..."
echo ""

# Configurações
WEBHOOK_URL="http://localhost:3001/api/webhooks/asaas"
TOKEN="wh_prod_meupersonal_2024_secure_token_a1b2c3d4e5f6"

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "📍 URL: $WEBHOOK_URL"
echo "🔑 Token: $TOKEN"
echo ""

# Teste 1: Webhook sem token (deve falhar)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Teste 1: Webhook SEM token (deve retornar 401)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST $WEBHOOK_URL \
  -H "Content-Type: application/json" \
  -d '{
    "event": "PAYMENT_CONFIRMED",
    "payment": {
      "id": "pay_test_123",
      "status": "CONFIRMED",
      "value": 100.00
    }
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "401" ]; then
  echo -e "${GREEN}✅ PASSOU${NC} - Retornou 401 como esperado"
else
  echo -e "${RED}❌ FALHOU${NC} - Esperado 401, recebeu $HTTP_CODE"
fi
echo "Response: $BODY"
echo ""

# Teste 2: Webhook com token correto (deve passar)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Teste 2: Webhook COM token (deve retornar 200)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST $WEBHOOK_URL \
  -H "Content-Type: application/json" \
  -H "asaas-access-token: $TOKEN" \
  -d '{
    "event": "PAYMENT_CONFIRMED",
    "payment": {
      "id": "pay_test_456",
      "status": "CONFIRMED",
      "value": 100.00,
      "customer": "cus_test_123",
      "externalReference": "meupersonal_STUDENT_PACKAGE_user123_1234567890"
    }
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ PASSOU${NC} - Retornou 200 como esperado"
else
  echo -e "${RED}❌ FALHOU${NC} - Esperado 200, recebeu $HTTP_CODE"
fi
echo "Response: $BODY"
echo ""

# Teste 3: Evento PAYMENT_RECEIVED
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Teste 3: Evento PAYMENT_RECEIVED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST $WEBHOOK_URL \
  -H "Content-Type: application/json" \
  -H "asaas-access-token: $TOKEN" \
  -d '{
    "event": "PAYMENT_RECEIVED",
    "payment": {
      "id": "pay_test_789",
      "status": "RECEIVED",
      "value": 50.00
    }
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ PASSOU${NC} - Retornou 200"
else
  echo -e "${RED}❌ FALHOU${NC} - Esperado 200, recebeu $HTTP_CODE"
fi
echo "Response: $BODY"
echo ""

# Teste 4: Evento PAYMENT_OVERDUE
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Teste 4: Evento PAYMENT_OVERDUE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST $WEBHOOK_URL \
  -H "Content-Type: application/json" \
  -H "asaas-access-token: $TOKEN" \
  -d '{
    "event": "PAYMENT_OVERDUE",
    "payment": {
      "id": "pay_test_999",
      "status": "OVERDUE",
      "value": 75.00
    }
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ PASSOU${NC} - Retornou 200"
else
  echo -e "${RED}❌ FALHOU${NC} - Esperado 200, recebeu $HTTP_CODE"
fi
echo "Response: $BODY"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Testes concluídos!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${YELLOW}📝 Próximos passos:${NC}"
echo "1. Verifique os logs do servidor"
echo "2. Configure o webhook no painel ASAAS"
echo "3. Faça um pagamento real de teste (R$ 0,01)"
echo ""

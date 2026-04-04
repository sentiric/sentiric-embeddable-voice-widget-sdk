# Değişkenler
PACKAGE_MANAGER := $(shell command -v pnpm >/dev/null 2>&1 && echo pnpm || echo npm)
NODE_BIN := ./node_modules/.bin

.PHONY: all setup fmt lint build test clean dev check

# Varsayılan: Kurulum yap, formatla, linter'dan geçir ve derle
all: setup fmt lint build

# Bağımlılıkları kontrol eder ve eksikse yükler
setup:
	@echo "📦 Bağımlılıklar kontrol ediliyor..."
	@if [ ! -d "node_modules" ]; then \
		echo "🛠️ node_modules bulunamadı, yükleniyor..."; \
		$(PACKAGE_MANAGER) install; \
	fi
	@# Prettier ve ESLint yoksa geliştirme bağımlılığı olarak ekle
	@if [ ! -f $(NODE_BIN)/prettier ] || [ ! -f $(NODE_BIN)/eslint ]; then \
		echo "🛠️ Linter araçları eksik, kuruluyor..."; \
		$(PACKAGE_MANAGER) add -D prettier eslint typescript @typescript-eslint/parser @typescript-eslint/eslint-plugin; \
	fi

# Kodu otomatik formatlar (Rustfmt benzeri)
fmt:
	@echo "🧹 Kod formatlanıyor (Prettier)..."
	@if [ -f $(NODE_BIN)/prettier ]; then \
		$(NODE_BIN)/prettier --write "src/**/*.{ts,tsx,js,jsx,json,css,scss}" --ignore-unknown; \
	else \
		npx prettier --write "src/**/*.{ts,tsx,js,jsx,json,css,scss}" --ignore-unknown; \
	fi

# Linter çalıştırır ve otomatik düzeltir (Clippy benzeri)
lint:
	@echo "🔍 Linter çalışıyor (ESLint)..."
	@# Baştaki '-' işareti hata olsa bile build'in devam etmesini sağlar
	-$(NODE_BIN)/eslint . --ext .ts,.tsx --fix

# TypeScript tip kontrolü (Hata varsa gösterir ama build'i durdurmaz)
check:
	@echo "🧪 Tip kontrolü yapılıyor (tsc)..."
	-$(NODE_BIN)/tsc --noEmit

# Üretim (Production) sürümü oluşturma
build:
	@echo "🏗️ Production build hazırlanıyor..."
	$(PACKAGE_MANAGER) run build

# Geliştirme sunucusunu başlatır
dev:
	@echo "🚀 Geliştirme sunucusu başlatılıyor..."
	$(PACKAGE_MANAGER) run dev

# Testleri çalıştırır
test:
	@echo "🧪 Testler koşturuluyor..."
	$(PACKAGE_MANAGER) run test

# Temizlik
clean:
	@echo "🗑️ Temizleniyor..."
	rm -rf dist node_modules
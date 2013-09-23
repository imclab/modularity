REPORTER?=dot
ifdef V
	REPORTER=spec
endif

test: check-deps
	@./node_modules/.bin/_mocha \
		--reporter $(REPORTER) test

coverage: check-deps
	@./node_modules/.bin/istanbul cover \
		./node_modules/.bin/_mocha -- -R spec

coverage-html: coverage
	@open coverage/lcov-report/index.html

clean:
	@rm -rf coverage

check: test

lint: check-deps
	@./node_modules/.bin/jshint -c ./.jshintrc index.js test/*.js

check-deps:
	@if test ! -d node_modules; then \
		echo "Installing npm dependencies.."; \
		npm install -d; \
	fi

.PHONY: test coverage lint

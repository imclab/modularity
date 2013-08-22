REPORTER?=dot
ifdef V
	REPORTER=spec
endif

test:
	@./node_modules/.bin/_mocha \
		--reporter $(REPORTER) test

coverage:
	@./node_modules/.bin/istanbul cover \
		./node_modules/.bin/_mocha -- -R spec || exit 1

coverage-html: coverage
	@open coverage/lcov-report/index.html

clean:
	@rm -rf coverage

check: test

.PHONY: test coverage

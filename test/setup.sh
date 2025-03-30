#!/bin/bash

mkdir -p dist/examples/scenarios/base-interactive
cp examples/scenarios/base-interactive/cli.sh dist/examples/scenarios/base-interactive/
chmod +x dist/examples/scenarios/base-interactive/cli.sh
echo "Test setup complete: Shell script copied and made executable" 
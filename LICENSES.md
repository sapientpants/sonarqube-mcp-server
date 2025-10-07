# License Information

This document describes the licenses used in this project and its dependencies.

## Project License

This project is licensed under the MIT License. See [LICENSE](./LICENSE) for details.

## Container Image Dependencies

The Docker container is based on Alpine Linux and includes the following system packages with their respective licenses:

### Acceptable GPL/LGPL Licenses

The following packages are part of the Alpine Linux base system and use GPL/LGPL licenses. These are acceptable for containerized applications:

| Package                  | License                             | Purpose                  | Acceptability                   |
| ------------------------ | ----------------------------------- | ------------------------ | ------------------------------- |
| `alpine-baselayout`      | GPL-2.0-only                        | Base directory structure | ✅ Alpine base - acceptable     |
| `alpine-baselayout-data` | GPL-2.0-only                        | Base data files          | ✅ Alpine base - acceptable     |
| `apk-tools`              | GPL-2.0-only                        | Package manager          | ✅ Alpine base - acceptable     |
| `busybox`                | GPL-2.0-only                        | Core utilities           | ✅ Alpine base - acceptable     |
| `busybox-binsh`          | GPL-2.0-only                        | Shell                    | ✅ Alpine base - acceptable     |
| `libapk2`                | GPL-2.0-only                        | APK library              | ✅ Alpine base - acceptable     |
| `libgcc`                 | GPL-2.0-or-later, LGPL-2.1-or-later | GCC runtime              | ✅ Runtime library - acceptable |
| `libstdc++`              | GPL-2.0-or-later, LGPL-2.1-or-later | C++ standard library     | ✅ Runtime library - acceptable |
| `musl-utils`             | GPL-2.0-or-later                    | C library utilities      | ✅ Runtime library - acceptable |

### Other Licenses

| Package                  | License          | Purpose           |
| ------------------------ | ---------------- | ----------------- |
| `ca-certificates-bundle` | MPL-2.0, MIT     | SSL certificates  |
| All other packages       | MIT, ISC, BSD-\* | Various utilities |

## License Compliance

### GPL/LGPL in Container Images

The use of GPL and LGPL licensed system libraries in container images is standard practice and acceptable because:

1. **Runtime Exception**: These are system libraries provided by Alpine Linux as part of the base operating system
2. **No Distribution of Modified Binaries**: We use these packages as-is from Alpine's official repositories
3. **Container Isolation**: The GPL components are part of the container runtime environment, not distributed as standalone software
4. **Industry Standard**: Major cloud providers and container registries (Docker Hub, GCR, ECR) all use Alpine Linux with these same packages

### Node.js Dependencies

All Node.js packages used in this project are licensed under permissive licenses (MIT, ISC, Apache-2.0). See `package.json` for the complete list.

## Trivy Security Scanning

This project uses Trivy to scan container images for:

- **Vulnerabilities** (CVEs)
- **Secrets** (hardcoded credentials)
- **Misconfigurations** (security best practices)
- **Licenses** (open-source compliance)

The license scanner will report GPL/LGPL packages from Alpine Linux. These findings are documented in this file and are acceptable for the reasons stated above.

## Questions?

If you have questions about licensing, please open an issue or contact the maintainers.

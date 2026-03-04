import os
import json
import requests
import base64
from collections import Counter
import time

# Configuration
GITHUB_TOKEN = os.getenv('GITHUB_TOKEN')
GITHUB_USERNAME = os.getenv('GITHUB_USERNAME', 'krugou')

CATEGORIES = {
    "Frontend": ["react", "react-dom", "svelte", "next", "vue", "react-router-dom", "expo", "react-native", "next-intl", "next-themes"],
    "Backend": ["express", "mongoose", "jsonwebtoken", "bcrypt", "passport", "socket.io", "morgan", "dotenv", "body-parser", "cors", "nodemailer", "mongodb", "sqlite3", "pg", "sequelize", "mysql2"],
    "UI/Styling": ["tailwindcss", "postcss", "autoprefixer", "sass", "@emotion/react", "@emotion/styled", "@mui/material", "@mui/icons-material", "framer-motion", "lucide-react", "bootstrap", "@fortawesome/react-fontawesome", "styled-components", "shadcn", "@radix-ui/react-slot"],
    "Testing": ["jest", "vitest", "playwright", "@playwright/test", "cypress", "@testing-library/react", "@testing-library/jest-dom", "mocha", "chai", "supertest", "jsdom", "vitest-mock-express"],
    "DevOps/CI": ["semantic-release", "@semantic-release/git", "@semantic-release/changelog", "husky", "lint-staged", "gh-pages", "docker", "pm2", "concurrently", "cross-env", "standard-version"],
    "Build Tools": ["vite", "webpack", "eslint", "prettier", "typescript", "babel", "@babel/core", "rollup", "esbuild", "ts-node", "tsx", "nodemon", "vite-plugin-pwa", "swc"],
    "Utilities": ["lodash", "axios", "date-fns", "uuid", "zod", "yup", "joi", "axios", "node-fetch", "clsx", "tailwind-merge", "nanoid", "crypto-js", "dayjs"],
    "State/Data": ["@tanstack/react-query", "zustand", "redux", "recoil", "react-hook-form", "i18next", "react-i18next"],
    "Visualization": ["three", "@react-three/fiber", "@react-three/drei", "chart.js", "react-chartjs-2", "recharts", "gsap", "animejs", "tsparticles", "react-particles"],
}

def get_repos_path():
    # Adjusted to look for siblings of the current project directory
    return os.path.abspath(os.path.join(os.getcwd(), '..'))

def get_package_data(content_str):
    try:
        data = json.loads(content_str)
        deps = data.get('dependencies', {})
        dev_deps = data.get('devDependencies', {})
        return set(deps.keys()) | set(dev_deps.keys())
    except Exception:
        return set()

def scrape_local_packages(package_counts):
    repos_path = get_repos_path()
    print(f"Scanning local directories in: {repos_path}")

    for repo_name in os.listdir(repos_path):
        repo_dir = os.path.join(repos_path, repo_name)
        if not os.path.isdir(repo_dir):
            continue

        repo_packages = set()
        for root, dirs, files in os.walk(repo_dir):
            if 'node_modules' in dirs:
                dirs.remove('node_modules')

            if 'package.json' in files:
                package_json_path = os.path.join(root, 'package.json')
                try:
                    with open(package_json_path, 'r', encoding='utf-8') as f:
                        repo_packages.update(get_package_data(f.read()))
                except Exception:
                    pass

        for pkg in repo_packages:
            package_counts[pkg] += 1

def scrape_github_packages(package_counts):
    headers = {'Accept': 'application/vnd.github.v3+json'}
    if GITHUB_TOKEN:
        headers['Authorization'] = f'token {GITHUB_TOKEN}'
        url = 'https://api.github.com/user/repos'
    else:
        url = f'https://api.github.com/users/{GITHUB_USERNAME}/repos'

    try:
        response = requests.get(url, headers=headers)
        if response.status_code != 200:
            print(f"GitHub API Error: {response.status_code}")
            return
        
        repos = response.json()
        for repo in repos:
            repo_name = repo['full_name']
            default_branch = repo.get('default_branch', 'main')
            print(f"  Scanning GitHub repo: {repo_name}...")

            repo_packages = set()
            tree_url = f"https://api.github.com/repos/{repo_name}/git/trees/{default_branch}?recursive=1"
            tree_resp = requests.get(tree_url, headers=headers)

            if tree_resp.status_code == 200:
                for item in tree_resp.json().get('tree', []):
                    path = item.get('path', '')
                    if path.endswith('package.json') and 'node_modules' not in path:
                        contents_url = f"https://api.github.com/repos/{repo_name}/contents/{path}"
                        contents_resp = requests.get(contents_url, headers=headers)
                        if contents_resp.status_code == 200:
                            content_data = contents_resp.json()
                            if 'content' in content_data:
                                try:
                                    decoded_content = base64.b64decode(content_data['content']).decode('utf-8')
                                    repo_packages.update(get_package_data(decoded_content))
                                except Exception: pass

                for pkg in repo_packages:
                    package_counts[pkg] += 1
    except Exception as e:
        print(f"GitHub Scraping failed: {e}")

def categorize_package(pkg_name):
    pkg_lower = pkg_name.lower()
    for cat, keywords in CATEGORIES.items():
        for kw in keywords:
            if kw.lower() in pkg_lower:
                return cat
    return "Other"

def main():
    package_counts = Counter()
    scrape_local_packages(package_counts)
    # scrape_github_packages(package_counts) # Optional: uncomment if needed

    sorted_results = dict(sorted(package_counts.items(), key=lambda item: item[1], reverse=True))
    
    categorized_data = {
        "stats": {
            "total_packages": len(sorted_results),
            "top_package": list(sorted_results.keys())[0] if sorted_results else "None",
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        },
        "packages": sorted_results,
        "categories": {}
    }

    for pkg, count in sorted_results.items():
        cat = categorize_package(pkg)
        if cat not in categorized_data["categories"]:
            categorized_data["categories"][cat] = []
        categorized_data["categories"][cat].append({"name": pkg, "count": count})

    os.makedirs('src', exist_ok=True)
    with open('src/skill_data.json', 'w', encoding='utf-8') as f:
        json.dump(categorized_data, f, indent=2)

    print(f"\nScraping complete. Found {len(sorted_results)} unique packages.")

if __name__ == "__main__":
    main()

import json
import re
from datetime import datetime, timezone
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
BRAND_DIR = BASE_DIR / 'Brands'
CAT_DIR = BASE_DIR / 'Categories'
OUTPUT_DIR = BASE_DIR / 'seeds' / 'catalog'
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

PATTERN = re.compile(r'^(?P<indent>\s*)-\s*(?P<text>.+?)\s*$')
SLUG_CHARS = re.compile(r'[^a-z0-9\-]+')


def slugify(name: str) -> str:
    text = name.strip().lower()
    text = text.replace('&', 'and')
    text = text.replace('+', 'and')
    text = text.replace('/', ' ')
    text = re.sub(r'\s+', ' ', text)
    text = text.replace(' ', '-')
    text = SLUG_CHARS.sub('-', text)
    while '--' in text:
        text = text.replace('--', '-')
    return text.strip('-')


def parse_markdown(path: Path):
    items = []
    for line in path.read_text(encoding='utf-8').splitlines():
        m = PATTERN.match(line)
        if not m:
            continue
        indent = len(m.group('indent'))
        text = m.group('text').strip()
        if text.startswith('**') and text.endswith('**'):
            text = text[2:-2].strip()
        if text.endswith('*') and not text.endswith('**'):
            text = text[:-1].strip()
        items.append((indent, text))
    return items


def build_tree(items):
    root = {'name': None, 'children': []}
    stack = [(-1, root)]
    for indent, text in items:
        node = {'name': text, 'children': []}
        while stack and indent <= stack[-1][0]:
            stack.pop()
        stack[-1][1]['children'].append(node)
        stack.append((indent, node))
    return root


def make_collection(slug, name, description, badge, parent_slug, tags, conditions, show_in_nav=False, featured=False):
    return {
        'id': slug,
        'slug': slug,
        'name': name,
        'description': description,
        'badge': badge,
        'coverImage': '',
        'parentSlug': parent_slug,
        'seo': {},
        'conditions': conditions,
        'cardTemplate': 'default',
        'sortBy': 'name-asc',
        'visible': True,
        'showInNav': show_in_nav,
        'featured': featured,
        'tags': tags,
        'createdAt': '2026-06-14T12:00:00.000Z',
        'updatedAt': '2026-06-14T12:00:00.000Z',
    }


def traverse(node, parent_slug, path, top_type, brand_name=None):
    collections = []
    for child in node.get('children', []):
        name = child['name']
        slug = '-'.join(path + [slugify(name)])
        if not slug:
            continue
        if top_type == 'brand':
            if parent_slug == 'brands':
                badge = 'Brand'
                tags = ['brand']
                conditions = {
                    'match': 'any',
                    'rules': [{'field': 'brand', 'operator': 'contains', 'value': name}],
                }
            else:
                badge = ''
                tags = ['category', slugify(brand_name)]
                # Brand sub-nodes require brand AND (category OR categories)
                conditions = {
                    'kind': 'group',
                    'match': 'all',
                    'children': [
                        {'kind': 'leaf', 'field': 'brand', 'operator': 'contains', 'value': brand_name},
                        {
                            'kind': 'group',
                            'match': 'any',
                            'children': [
                                {'kind': 'leaf', 'field': 'category', 'operator': 'contains', 'value': name},
                                {'kind': 'leaf', 'field': 'categories', 'operator': 'contains', 'value': name},
                            ],
                        },
                    ],
                }
        else:
            if parent_slug == 'categories':
                badge = 'Category'
                tags = ['category']
                conditions = {
                    'match': 'any',
                    'rules': [{'field': 'category', 'operator': 'contains', 'value': name}],
                }
            else:
                badge = ''
                tags = ['category']
                conditions = {
                    'match': 'any',
                    'rules': [
                        {'field': 'category', 'operator': 'contains', 'value': name},
                        {'field': 'categories', 'operator': 'contains', 'value': name},
                    ],
                }
        collections.append(make_collection(
            slug=slug,
            name=name,
            description=f'{name} products',
            badge=badge,
            parent_slug=parent_slug,
            tags=tags,
            conditions=conditions,
            show_in_nav=False,
            featured=False,
        ))
        next_brand = name if parent_slug == 'brands' else brand_name
        collections.extend(traverse(child, slug, path + [slugify(name)], top_type, brand_name=next_brand))
    return collections


def build_collections(root_slug, root_name, root_badge, top_type, source_files):
    collections = [make_collection(
        slug=root_slug,
        name=root_name,
        description=f'{root_name} collection',
        badge=root_badge,
        parent_slug=None,
        tags=[],
        conditions={'match': 'any', 'rules': []},
        show_in_nav=True,
        featured=False,
    )]
    for path in source_files:
        items = parse_markdown(path)
        tree = build_tree(items)
        if len(tree['children']) != 1:
            raise ValueError(f'Expected single root node in {path.name}; got {len(tree["children"])} roots')
        root_node = tree['children'][0]
        name = root_node['name']
        slug = slugify(name)
        if top_type == 'brand':
            badge = 'Brand'
            tags = ['brand']
            conditions = {
                'match': 'any',
                'rules': [{'field': 'brand', 'operator': 'contains', 'value': name}],
            }
        else:
            badge = 'Category'
            tags = ['category']
            conditions = {
                'match': 'any',
                'rules': [{'field': 'category', 'operator': 'contains', 'value': name}],
            }
        collections.append(make_collection(
            slug=slug,
            name=name,
            description=f'{name} products',
            badge=badge,
            parent_slug=root_slug,
            tags=tags,
            conditions=conditions,
            show_in_nav=False,
            featured=False,
        ))
        collections.extend(traverse(root_node, slug, [slug], top_type, brand_name=name))
    return collections


def write_export(filename, collections):
    slug_counts = {}
    for collection in collections:
        slug_counts[collection['slug']] = slug_counts.get(collection['slug'], 0) + 1
    duplicates = [slug for slug, count in slug_counts.items() if count > 1]
    if duplicates:
        raise ValueError(f'Duplicate slugs in {filename}: {duplicates}')

    data = {
        'version': 1,
        'exportedAt': datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z'),
        'collectionCount': len(collections),
        'collections': collections,
    }
    (OUTPUT_DIR / filename).write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding='utf-8')


def main():
    brand_files = sorted([f for f in BRAND_DIR.glob('*.md') if f.name != 'All Brands.md'])
    category_files = sorted([f for f in CAT_DIR.glob('*.md') if f.name != 'All Categories.md'])

    brand_collections = build_collections('brands', 'Brands', '', 'brand', brand_files)
    category_collections = build_collections('categories', 'Categories', 'Category', 'category', category_files)
    all_collections = brand_collections + category_collections

    write_export('brands.json', brand_collections)
    write_export('categories.json', category_collections)
    write_export('collections.json', all_collections)

    print('Wrote brands.json:', len(brand_collections), 'collections')
    print('Wrote categories.json:', len(category_collections), 'collections')
    print('Wrote collections.json:', len(all_collections), 'collections')
    print('brand files used:', [f.name for f in brand_files])
    print('category files used:', [f.name for f in category_files])


if __name__ == '__main__':
    main()

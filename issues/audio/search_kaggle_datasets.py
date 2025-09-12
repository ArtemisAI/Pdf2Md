import kagglehub

# Search for datasets with "audio" in the title
datasets = kagglehub.search_datasets("audio")

for dataset in datasets:
    print(f"Title: {dataset.title}")
    print(f"ID: {dataset.id}")
    print(f"URL: {dataset.url}")
    print("-" * 20)
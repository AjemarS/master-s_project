from setuptools import find_packages, setup

setup(
    name="techhub-shared",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "Django>=5.0",
        "djangorestframework>=3.15",
        "pika>=1.3",
    ],
    python_requires=">=3.11",
)

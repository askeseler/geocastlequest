pyinstaller --onefile --noconsole deploy.py
cp ./dist/deploy.exe ./deploy.exe
rm -r ./dist
rm -r ./build
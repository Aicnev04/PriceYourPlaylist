# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.


# Current set-up for CSE 115A Project

## Initalizing your Python virtual enviroment
Create a venv in the api folder using
```python -m venv venv```

Once the venv has been created start working in the venv by using the command:
```MacOS: source .venv/bin/activate Windows: ./venv/Scripts/activate```

Finally download all the dependencies with:
```pip install -r requirements.txt```

You should only have to do this once on your local machine, the .gitignore exludes the venv from being pushed because Python module sourcing is dependent on the machine

## Getting the backend and frontend servers running
Open a terminal in the root directory and run
```npm run dev```
 
This is for the frontend react server, it should give http://localhost:5173/

Next open another terminal in the root directory and run
```npm run api```
 
This is for the backend python server just to give info to the react server
The result should just be a local webpage that says Hello World and the time/date
/** @type {import('tailwindcss').Config} */
export default {
	content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
	theme: {
		extend: {
			colors: {
				primary: {
					50: "#eff6ff",
					100: "#dbeafe",
					200: "#bfdbfe",
					300: "#93c5fd",
					400: "#60a5fa",
					500: "#3b82f6",
					600: "#2563eb",
					700: "#1d4ed8",
					800: "#1e40af",
					900: "#1e3a8a",
				},
				glass: {
					light: "rgba(255, 255, 255, 0.08)",
					medium: "rgba(255, 255, 255, 0.12)",
					heavy: "rgba(255, 255, 255, 0.18)",
				},
			},
			animation: {
				"fade-in": "fadeIn 0.3s ease-out",
				"slide-in-left": "slideInLeft 0.3s ease-out",
				"slide-in-right": "slideInRight 0.3s ease-out",
				"slide-up": "slideUp 0.3s ease-out",
				"pulse-soft": "pulseSoft 2s ease-in-out infinite",
				"bounce-in": "bounceIn 0.5s ease-out",
			},
			keyframes: {
				fadeIn: {
					"0%": { opacity: "0" },
					"100%": { opacity: "1" },
				},
				slideInLeft: {
					"0%": { transform: "translateX(-20px)", opacity: "0" },
					"100%": { transform: "translateX(0)", opacity: "1" },
				},
				slideInRight: {
					"0%": { transform: "translateX(20px)", opacity: "0" },
					"100%": { transform: "translateX(0)", opacity: "1" },
				},
				slideUp: {
					"0%": { transform: "translateY(10px)", opacity: "0" },
					"100%": { transform: "translateY(0)", opacity: "1" },
				},
				pulseSoft: {
					"0%, 100%": { opacity: "1" },
					"50%": { opacity: "0.7" },
				},
				bounceIn: {
					"0%": { transform: "scale(0.9)", opacity: "0" },
					"50%": { transform: "scale(1.02)" },
					"100%": { transform: "scale(1)", opacity: "1" },
				},
			},
			backdropBlur: {
				xs: "2px",
			},
		},
	},
	// eslint-disable-next-line no-undef
	plugins: [require("daisyui")],
	daisyui: {
		themes: ["night"],
	},
};

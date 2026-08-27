// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			requestId: string;
			user: User | null;
		}
		interface User {
			id: string;
			email: string;
			display_name: string;
			role: 'student' | 'educator' | 'admin';
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};

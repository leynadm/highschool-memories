import type { AstroInstance } from 'astro';
import { Github, Linkedin } from 'lucide-astro';

export interface SocialLink {
	name: string;
	url: string;
	icon: AstroInstance;
}

export default {
	title: 'Amintiri din Liceu',
	favicon: 'favicon.svg',
	owner: 'Amintiri din Liceu - CNAV - Clasa E - 2015',
	profileImage: 'profile.webp',
	socialLinks: [
		{
			name: 'GitHub',
			url: 'https://github.com/leynadm',
			icon: Github,
		} as SocialLink,
		{
			name: 'LinkedIn',
			url: 'https://www.linkedin.com/in/matei-daniel/',
			icon: Linkedin,
		} as SocialLink,
	],
};

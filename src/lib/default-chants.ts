
export interface DefaultChant {
    id: string;
    text: string;
    description: string;
    voiceName?: string;
    lang?: string;
    audioUrl?: string;
}

export const defaultChants: DefaultChant[] = [
    {
        id: 'radha-radha-premanand',
        text: 'राधा राधा',
        description: 'Authentic chant musically.',
        audioUrl: '/audio/radhaMaharajji.m4a',
    },
    {
        id: 'radha-radha',
        text: 'राधा राधा',
        description: 'Radha Radha Slowly.',
        audioUrl: '/audio/radhaSlowly.m4a',
    },
    {
        id: 'ram-ram',
        text: 'राम राम',
        description: 'Radha Radha Slowly.',
        audioUrl: '/audio/ramram.m4a',
    },
    {
        id: 'om-namah-shivaye',
        text: 'ॐ नमः शिवाय',
        description: 'Deep male voice.',
        // voiceName: 'hi-IN-Wavenet-B',
        // lang: 'hi-IN',
        audioUrl: '/audio/omNamahShiv.m4a',
    },
    {
        id: 'hare-krishna',
        text: 'हरे कृष्णा',
        description: 'Gentle, calm female voice.',
        // voiceName: 'hi-IN-Wavenet-D',
        // lang: 'hi-IN',
        audioUrl: '/audio/harekrishana.m4a',

    },
   
    {
        id: 'waheguru',
        text: 'वाहेगुरु',
        description: 'Clear, resonant male voice.',
        voiceName: 'hi-IN-Wavenet-D',
        lang: 'hi-IN',
    },
];

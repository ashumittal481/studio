export interface DefaultChant {
    id: string;
    text: string;
    description: string;
    voiceName: string;
    lang: string;
}

export const defaultChants: DefaultChant[] = [
    {
        id: 'radha-radha',
        text: 'राधा राधा',
        description: 'A soothing female voice.',
        voiceName: 'hi-IN-Wavenet-A',
        lang: 'hi-IN',
    },
    {
        id: 'om-namah-shivaye',
        text: 'ॐ नमः शिवाय',
        description: 'A deep male voice.',
        voiceName: 'hi-IN-Wavenet-B',
        lang: 'hi-IN',
    },
    {
        id: 'hare-krishna',
        text: 'हरे कृष्णा',
        description: 'A gentle female voice.',
        voiceName: 'hi-IN-Wavenet-C',
        lang: 'hi-IN',
    },
    {
        id: 'jai-shri-ram',
        text: 'जय श्री राम',
        description: 'A powerful male voice.',
        voiceName: 'hi-IN-Wavenet-D',
        lang: 'hi-IN',
    },
    {
        id: 'waheguru',
        text: 'वाहेगुरु',
        description: 'A clear female voice.',
        voiceName: 'hi-IN-Wavenet-A', // Re-using voice A for variety
        lang: 'hi-IN',
    },
];

    
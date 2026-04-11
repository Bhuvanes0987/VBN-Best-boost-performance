import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';


const CustomFitPreset = definePreset(Aura, {
    semantic: {
        primary: {
            50: '{blue.50}',
            100: '{blue.100}',
            200: '{blue.200}',
            300: '{blue.300}',
            400: '{blue.400}',
            500: '#1F4C83', 
            
            600: '#1a3f6d',
            700: '#153257',
            800: '#102541',
            900: '#0b182b',
            950: '{blue.950}'
        },
        colorScheme: {
            light: {
                primary: {
                    color: '#1F4C83', 
                    contrastColor: '#ffffff',
                    hoverColor: '#1a3f6d',
                    activeColor: '#153257'
                },
                highlight: {
                    background: 'rgba(31, 76, 131, 0.1)', 
                    focusBackground: 'rgba(31, 76, 131, 0.2)',
                    color: '#1F4C83',
                    focusColor: '#1a3f6d'
                },
                surface: {
                    0: '#ffffff',
                    50: '#F9FAFB',
                    100: '#F3F4F6',
                    200: '#E5E7EB',
                    300: '#D1D5DB',
                    400: '#9CA3AF',
                    500: '#6B7280',
                    600: '#4B5563',
                    700: '#374151',
                    800: '#1F2937',
                    900: '#111827',
                    950: '#030712'
                }
            },
        }
    }
});

export default CustomFitPreset;

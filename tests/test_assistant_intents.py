import unittest
from unittest.mock import patch
from app import assistant,assistant_intents as intents


class IntentTests(unittest.TestCase):
    def test_soy_location_and_short_map_followup(self):
        self.assertEqual(intents.resolve('onde tem soja ?',[])['class_ids'],[39])
        prior=[{'question':'produção de soja','answer':'Dados estaduais.'},{'question':'onde tem soja ?','answer':'Vou destacar.'}]
        self.assertEqual(intents.resolve('no mapa',prior),{'kind':'crop_map','class_ids':[39],'continuation':True})

    def test_negation_explanation_and_unrelated_followup_do_not_replay_a_crop(self):
        for question in ['não mostre soja','onde não tem soja?','o que significa soja no mapa?',
                         'onde comprar soja?', 'onde a soja está com baixo vigor?']:
            self.assertEqual(intents.resolve(question,[])['kind'],'conversation')
        prior=[{'question':'onde tem soja?','answer':'Camada.'},{'question':'o que significa baixo vigor?','answer':'Mostre soja no mapa.'}]
        self.assertEqual(intents.resolve('no mapa',prior)['kind'],'conversation')
        self.assertEqual(intents.resolve('no mapa',[{'question':'Olá','answer':'onde tem soja?'}])['kind'],'conversation')

    def test_supported_crop_and_unavailable_separate_layer(self):
        self.assertEqual(intents.resolve('mostre café e arroz no mapa',[])['class_ids'],[40,46])
        self.assertEqual(intents.resolve('onde tem milho?',[])['kind'],'unsupported_crop_map')

    def test_production_is_not_implicitly_a_forecast(self):
        self.assertEqual(intents.resolve('produção de soja',[])['kind'],'soy_production')
        self.assertEqual(intents.resolve('qual a produção de soja?',[])['kind'],'soy_production')
        self.assertEqual(intents.resolve('qual vai ser a produção de soja?',[])['kind'],'conversation')
        self.assertEqual(intents.focus('produção de soja em Sorriso'),'production')
        self.assertEqual(intents.focus('prever produção deste talhão'),'monitoring')

    def test_map_navigation_does_not_need_gemini_or_sample_history(self):
        saved={'result':{'name':'Sorriso','uf':'MT'}}
        with patch.object(assistant.storage,'source_snapshot',return_value=saved),patch.object(assistant.research,'model_status',return_value={}),patch.object(assistant.research,'dataset') as history,patch.object(assistant,'urlopen') as provider:
            result=assistant.ask({'prompt':'onde tem soja?','dataset_id':'wrong-history','municipality_code':'5107925','map_year':2024},{})
        self.assertEqual(result['action'],{'kind':'filter_crops','class_ids':[39]})
        self.assertIn('2024',result['answer']);self.assertIn('Sorriso',result['answer'])
        history.assert_not_called();provider.assert_not_called()
        self.assertNotIn('68,72',result['answer'])

    def test_production_uses_regional_source_and_scope(self):
        saved={'result':{'name':'Sorriso','uf':'MT','conab':{'SOJA':{'records':[{'season':'2024/25','production_t':1000},{'season':'2025/26','production_t':2000}]}}}}
        with patch.object(assistant.storage,'source_snapshot',return_value=saved),patch.object(assistant.research,'model_status',return_value={}),patch.object(assistant,'urlopen') as provider:
            result=assistant.ask({'prompt':'produção de soja','municipality_code':'5107925'}, {})
        self.assertIn('2.000 toneladas',result['answer']);self.assertIn('MT',result['answer']);self.assertIn('estadual',result['answer'])
        self.assertEqual(result['sources'][0]['id'],'conab_state');provider.assert_not_called()

    def test_missing_production_asks_for_focus_without_inventing_numbers(self):
        response=intents.reply({'kind':'soy_production'},{'evidence':[],'map':{'municipality_name':'Sorriso'}})
        self.assertIn('Você quer',response['answer']);self.assertEqual(response['evidence_ids'],[])

    def test_map_year_is_validated(self):
        for year in (2026,True,'2025'):
            with self.assertRaises(ValueError):assistant.context({'municipality_code':'5107925','map_year':year})


if __name__=='__main__':unittest.main()
